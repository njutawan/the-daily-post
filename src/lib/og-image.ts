import sharp from "sharp";
import type { Article } from "@/data/articles";

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .slice(0, 280);
}

/** Wrap headline into up to 4 lines that fit the OG card width (640px panel with 80px padding). */
function wrapHeadline(title: string, maxCharsPerLine = 22): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

/**
 * Build a branded Open Graph card (1200x630) for an article using sharp.
 * Layout: left = text block (logo, category, headline, byline), right = image crop.
 */
export async function generateOGImage(article: Article): Promise<Buffer> {
  // Resolve the article image to a local file path (it lives in /public/images)
  const imgPath = article.imageUrl.startsWith("/images/")
    ? `${process.cwd()}/public${article.imageUrl}`
    : null;

  // Fetch the cover image bytes if local
  let coverBuffer: Buffer | null = null;
  if (imgPath) {
    try {
      const fs = await import("fs/promises");
      coverBuffer = await fs.readFile(imgPath);
    } catch {
      coverBuffer = null;
    }
  }

  // Build the cover half (right side) — 560px wide crop
  let rightSvg = `<rect x="640" y="0" width="560" height="${HEIGHT}" fill="#1c1917" />`;
  if (coverBuffer) {
    try {
      const cropped = await sharp(coverBuffer)
        .resize(560, HEIGHT, { fit: "cover", position: "centre" })
        .jpeg({ quality: 80 })
        .toBuffer();
      const b64 = cropped.toString("base64");
      rightSvg = `
        <image x="640" y="0" width="560" height="${HEIGHT}" href="data:image/jpeg;base64,${b64}" preserveAspectRatio="xMidYMid slice" />
        <rect x="640" y="0" width="560" height="${HEIGHT}" fill="url(#fadeRight)" />
      `;
    } catch {
      /* keep fallback rect */
    }
  }

  const headlineLines = wrapHeadline(article.title);
  const headlineTspans = headlineLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 62}">${escapeXml(line)}</tspan>`)
    .join("");

  const initialsBadge = initials(article.author);
  const catWidth = article.category.length * 11 + 28;
  const catCenterX = 80 + catWidth / 2;

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f5f5f4" />
      </linearGradient>
      <linearGradient id="fadeRight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.55" />
        <stop offset="40%" stop-color="#000000" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" />

    <!-- Left text panel -->
    <rect x="0" y="0" width="640" height="${HEIGHT}" fill="#ffffff" />

    <!-- Top accent bar -->
    <rect x="0" y="0" width="640" height="8" fill="#b91c1c" />

    <!-- Logo -->
    <text x="80" y="108" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" fill="#000000">The Daily Post</text>

    <!-- Motto -->
    <text x="80" y="138" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#78716c">Democracy Dies in Darkness</text>

    <!-- Category label -->
    <rect x="80" y="176" width="${catWidth}" height="32" fill="#b91c1c" />
    <text x="${catCenterX}" y="197" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">${escapeXml(article.category.toUpperCase())}</text>

    <!-- Headline -->
    <text x="80" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="900" fill="#000000" letter-spacing="-1">
      ${headlineTspans}
    </text>

    <!-- Byline avatar -->
    <circle cx="98" cy="${HEIGHT - 72}" r="20" fill="#1c1917" />
    <text x="98" y="${HEIGHT - 66}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(initialsBadge)}</text>
    <text x="130" y="${HEIGHT - 78}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#000000">${escapeXml(article.author)}</text>
    <text x="130" y="${HEIGHT - 56}" font-family="Arial, sans-serif" font-size="13" fill="#78716c">${escapeXml(article.authorTitle || "The Daily Post")}</text>

    <!-- Read time -->
    <text x="80" y="${HEIGHT - 28}" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#78716c" letter-spacing="1">${escapeXml(article.time.toUpperCase())} · ${article.readTime} MIN READ</text>

    <!-- Right image panel -->
    ${rightSvg}
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return png;
}
