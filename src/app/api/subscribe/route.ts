import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { subscribeSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email";
import { createNewsletterToken, hashUnsubscribeToken } from "@/lib/newsletter-tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, { max: 3, windowMs: 60_000 });
  if (limited) return limited;

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
    if (existing?.verified && !existing.unsubscribedAt) {
      return NextResponse.json(
        {
          ok: true,
          message: "You're already subscribed. Welcome back!",
          verified: true,
        },
        { status: 200 }
      );
    }

    const verificationToken = createNewsletterToken();
    const unsubscribeToken = createNewsletterToken();
    const subscriberData = {
      source,
      verified: false,
      verifyToken: verificationToken,
      unsubscribeTokenHash: hashUnsubscribeToken(unsubscribeToken),
      unsubscribedAt: null,
    };

    if (existing) {
      await db.subscriber.update({
        where: { id: existing.id },
        data: subscriberData,
      });
    } else {
      await db.subscriber.create({
        data: { email, ...subscriberData },
      });
    }

    const emailResult = await sendVerificationEmail(
      email,
      verificationToken,
      unsubscribeToken
    );
    if (!emailResult.ok) {
      return NextResponse.json(
        { ok: false, error: emailResult.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: emailResult.message,
        verified: false,
        ...(emailResult.actionUrl ? { verificationUrl: emailResult.actionUrl } : {}),
      },
      { status: existing ? 200 : 201 }
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

    if (verify) {
      const subscriber = await db.subscriber.findFirst({
        where: { verifyToken: verify },
      });
      if (!subscriber) {
        return NextResponse.json(
          { ok: false, error: "Invalid or already used verification token." },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      if (subscriber.unsubscribedAt) {
        return NextResponse.json(
          { ok: false, error: "This subscription request has been cancelled." },
          { status: 410, headers: { "Cache-Control": "no-store" } }
        );
      }
      if (subscriber.verified) {
        return NextResponse.json(
          { ok: true, message: "Your subscription is already confirmed." },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      await db.subscriber.update({
        where: { id: subscriber.id },
        data: { verified: true, verifyToken: null },
      });
      return NextResponse.json(
        {
          ok: true,
          message: "Subscription confirmed! Thanks for verifying your email.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const count = await db.subscriber.count({
      where: { verified: true, unsubscribedAt: null },
    });
    return NextResponse.json(
      { ok: true, count },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error({ err }, "[/api/subscribe GET] error");
    return NextResponse.json(
      { ok: false, error: "Unable to read subscriber information." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
