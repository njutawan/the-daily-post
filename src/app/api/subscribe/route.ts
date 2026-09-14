import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { subscribeSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function POST(req: NextRequest) {
  // Rate limit: 3 subscribe attempts per minute per IP
  const limited = rateLimitResponse(req, { max: 3, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = subscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 422 }
    );
  }

  const { email, source } = parsed.data;

  try {
    const existing = await db.subscriber.findUnique({ where: { email } });
    if (existing) {
      if (existing.verified) {
        return NextResponse.json(
          {
            ok: true,
            message: "You're already subscribed. Welcome back!",
            verified: true,
          },
          { status: 200 }
        );
      }
      // Already subscribed but not verified — regenerate token
      const verifyToken = makeToken();
      await db.subscriber.update({
        where: { email },
        data: { verifyToken },
      });
      const emailResult = await sendVerificationEmail(email, verifyToken);
      return NextResponse.json(
        {
          ok: true,
          message: emailResult.message,
          verified: false,
        },
        { status: 200 }
      );
    }
    const verifyToken = makeToken();
    await db.subscriber.create({
      data: { email, source, verified: false, verifyToken },
    });
    const emailResult = await sendVerificationEmail(email, verifyToken);
    return NextResponse.json(
      {
        ok: true,
        message: emailResult.message,
        verified: false,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error({ err }, "[/api/subscribe] error");
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const verify = url.searchParams.get("verify");

    // ?verify=TOKEN flow: mark subscriber as verified
    if (verify) {
      const subscriber = await db.subscriber.findFirst({
        where: { verifyToken: verify },
      });
      if (!subscriber) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired verification token." },
          { status: 404 }
        );
      }
      if (subscriber.verified) {
        return NextResponse.json({
          ok: true,
          message: "Your subscription is already confirmed.",
          email: subscriber.email,
        });
      }
      await db.subscriber.update({
        where: { id: subscriber.id },
        data: { verified: true, verifyToken: null },
      });
      return NextResponse.json({
        ok: true,
        message: "Subscription confirmed! Thanks for verifying your email.",
        email: subscriber.email,
      });
    }

    // Default: return verified-subscriber count
    const count = await db.subscriber.count({ where: { verified: true } });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    logger.error({ err }, "[/api/subscribe GET] error");
    return NextResponse.json(
      { ok: false, error: "Unable to read subscriber count." },
      { status: 500 }
    );
  }
}
