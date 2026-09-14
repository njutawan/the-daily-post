import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { rateLimitResponse } from "@/lib/rate-limit";
import { ttsSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 1000; // TTS API limit is 1024; keep a small buffer
const CACHE_DIR = path.join(process.cwd(), ".tts-cache");

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

function hashKey(text: string, voice: string, speed: number): string {
  return crypto
    .createHash("sha1")
    .update(`${voice}|${speed}|${text}`)
    .digest("hex")
    .slice(0, 24);
}

async function getCached(key: string): Promise<Buffer | null> {
  try {
    const p = path.join(CACHE_DIR, `${key}.wav`);
    const buf = await fs.readFile(p);
    return buf;
  } catch {
    return null;
  }
}

async function setCached(key: string, buf: Buffer) {
  try {
    const p = path.join(CACHE_DIR, `${key}.wav`);
    await fs.writeFile(p, buf);
  } catch {
    /* ignore cache write errors */
  }
}

const MAX_CACHE_FILES = 200;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Lazy eviction: delete files older than 7 days; if still > MAX_CACHE_FILES, trim oldest. */
let evictionRunning = false;
let startupCleanupDone = false;
async function evictStaleCache() {
  if (evictionRunning) return;
  evictionRunning = true;
  try {
    const entries = await fs.readdir(CACHE_DIR).catch(() => []);
    const now = Date.now();
    const files: Array<{ name: string; mtime: number; size: number }> = [];
    for (const name of entries) {
      if (!name.endsWith(".wav")) continue;
      try {
        const p = path.join(CACHE_DIR, name);
        const stat = await fs.stat(p);
        if (now - stat.mtimeMs > MAX_CACHE_AGE_MS) {
          await fs.unlink(p).catch(() => {});
        } else {
          files.push({ name, mtime: stat.mtimeMs, size: stat.size });
        }
      } catch {
        /* ignore */
      }
    }
    // If still too many files, trim the oldest
    if (files.length > MAX_CACHE_FILES) {
      files.sort((a, b) => a.mtime - b.mtime);
      const toRemove = files.slice(0, files.length - MAX_CACHE_FILES);
      for (const f of toRemove) {
        await fs.unlink(path.join(CACHE_DIR, f.name)).catch(() => {});
      }
    }
  } catch {
    /* ignore eviction errors */
  } finally {
    evictionRunning = false;
  }
}

function splitTextIntoChunks(text: string, maxLength = MAX_LEN): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/["""]/g, '"')
    .replace(/["""]/g, "'")
    .replace(/—/g, ",")
    .replace(/–/g, "-")
    .replace(/\$/g, " dollars ")
    .replace(/%/g, " percent ")
    .trim();
}

/**
 * Concatenate multiple WAV files (same format: 16-bit mono PCM 24kHz) into one.
 * Each WAV has a 44-byte header followed by PCM samples; we keep the first
 * header and append all samples, updating the data chunk size + RIFF size.
 */
function concatWavs(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  // Parse the first header to find the data offset
  const first = buffers[0];
  // Standard WAV header: "RIFF"...."data".... then samples
  // The "data" chunk starts at byte 36 ("data" at 36, size at 40, samples at 44)
  const dataOffset = 44;
  let totalData = 0;
  for (const b of buffers) {
    totalData += b.length - dataOffset;
  }

  const out = Buffer.alloc(dataOffset + totalData);
  first.copy(out, 0, 0, dataOffset); // copy header from first file
  // Update RIFF size (bytes 4-7) and data size (bytes 40-43)
  out.writeUInt32LE(36 + totalData, 4); // RIFF chunk size = 36 + data
  out.writeUInt32LE(totalData, 40); // data chunk size

  let writePos = dataOffset;
  for (const b of buffers) {
    const len = b.length - dataOffset;
    b.copy(out, writePos, dataOffset, b.length);
    writePos += len;
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 TTS requests per minute per IP (expensive operation)
  const limited = rateLimitResponse(req, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ttsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 422 }
    );
  }

  const rawText = parsed.data.text;
  const voice = parsed.data.voice;
  const speed = parsed.data.speed;
  const mode = parsed.data.mode;

  const cleaned = cleanTextForTTS(rawText);
  if (!cleaned) {
    return NextResponse.json({ ok: false, error: "Text is required." }, { status: 422 });
  }

  const chunks = splitTextIntoChunks(cleaned);
  if (chunks.length === 0) {
    return NextResponse.json({ ok: false, error: "No speakable text." }, { status: 422 });
  }

  // In preview mode, only synthesize the first chunk for fast playback.
  // In full mode, synthesize all chunks and concatenate.
  const chunksToSynth = mode === "full" ? chunks : [chunks[0]];

  // Cache key covers voice + speed + the exact chunk(s) + mode
  const cacheKey = hashKey(chunksToSynth.join("\n--\n"), voice, speed);

  try {
    await ensureCacheDir();
    // On the first request after a server start, run a full cleanup synchronously
    // (ensures the cache is pruned even without ongoing traffic).
    if (!startupCleanupDone) {
      startupCleanupDone = true;
      await evictStaleCache();
    } else {
      // Subsequent requests: run lazy eviction without blocking
      evictStaleCache();
    }

    // 1. Try the cache for the full concatenated result
    const cachedFull = await getCached(cacheKey);
    if (cachedFull) {
      return new NextResponse(new Uint8Array(cachedFull), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": cachedFull.length.toString(),
          "Cache-Control": "public, max-age=86400",
          "X-TTS-Cache": "HIT",
          "X-TTS-Chunks": String(chunksToSynth.length),
        },
      });
    }

    // 2. Synthesize each chunk (in parallel), using per-chunk cache when available
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const wavBuffers = await Promise.all(
      chunksToSynth.map(async (chunk) => {
        const chunkKey = hashKey(chunk, voice, speed);
        const cached = await getCached(chunkKey);
        if (cached) return cached;
        const response = await zai.audio.tts.create({
          input: chunk,
          voice,
          speed,
          response_format: "wav",
          stream: false,
        });
        const arrayBuffer = await response.arrayBuffer();
        const buf = Buffer.from(new Uint8Array(arrayBuffer));
        await setCached(chunkKey, buf);
        return buf;
      })
    );

    const result = wavBuffers.length === 1 ? wavBuffers[0] : concatWavs(wavBuffers);

    // Cache the final concatenated result too
    if (wavBuffers.length > 1) {
      await setCached(cacheKey, result);
    }

    return new NextResponse(new Uint8Array(result), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": result.length.toString(),
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Cache": "MISS",
        "X-TTS-Chunks": String(chunksToSynth.length),
      },
    });
  } catch (err) {
    logger.error({ err }, "[/api/tts] error");
    return NextResponse.json(
      { ok: false, error: "Failed to generate audio. Please try again." },
      { status: 500 }
    );
  }
}
