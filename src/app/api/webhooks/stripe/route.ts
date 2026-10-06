import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getStripeWebhookSecret,
  verifyStripeWebhookSignature,
} from "@/lib/stripe";
import { processStripeWebhookEvent, type StripeWebhookEvent } from "@/lib/stripe-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readLimitedBody(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function parseEvent(rawBody: string): StripeWebhookEvent | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const event = parsed as Record<string, unknown>;
    const data = event.data;
    if (
      typeof event.id !== "string" ||
      typeof event.type !== "string" ||
      typeof event.created !== "number" ||
      typeof data !== "object" || data === null || Array.isArray(data)
    ) {
      return null;
    }
    const object = (data as Record<string, unknown>).object;
    if (typeof object !== "object" || object === null || Array.isArray(object)) return null;
    return {
      id: event.id,
      type: event.type,
      created: event.created,
      data: { object: object as Record<string, unknown> },
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 1_000_000) {
    return NextResponse.json({ error: "Webhook payload too large" }, { status: 413 });
  }

  let rawBody: string | null;
  try {
    rawBody = await readLimitedBody(request, 1_000_000);
  } catch {
    return NextResponse.json({ error: "Could not read webhook payload" }, { status: 400 });
  }
  if (rawBody === null) {
    return NextResponse.json({ error: "Webhook payload too large" }, { status: 413 });
  }

  const signature = request.headers.get("stripe-signature");
  let secret: string;
  try {
    secret = getStripeWebhookSecret();
  } catch (error) {
    logger.error({ err: error }, "[stripe webhook] missing signing secret");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = parseEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Invalid Stripe event payload" }, { status: 400 });
  }

  try {
    await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Stripe retries deliveries. A previously committed event is acknowledged;
    // all other failures return 500 so a transient DB issue can be retried.
    const existing = await db.stripeWebhookEvent.findUnique({ where: { id: event.id } }).catch(() => null);
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    logger.error({ err: error, stripeEventId: event.id, stripeEventType: event.type }, "[stripe webhook] processing failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
