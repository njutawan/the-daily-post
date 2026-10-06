import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { sendUnsubscribeEmail } from "@/lib/email";
import { createNewsletterToken, hashUnsubscribeToken } from "@/lib/newsletter-tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const unsubscribeSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    token: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.email) !== Boolean(data.token), {
    message: "Provide an email address or an unsubscribe token.",
  });

const genericRequestMessage =
  "If this address has a newsletter subscription, we'll email a secure unsubscribe link shortly.";

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

  const parsed = unsubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 422 }
    );
  }

  try {
    if (parsed.data.token) {
      const token = parsed.data.token.toLowerCase();
      const subscriber = await db.subscriber.findUnique({
        where: { unsubscribeTokenHash: hashUnsubscribeToken(token) },
      });

      if (!subscriber) {
        return NextResponse.json(
          { ok: false, error: "This unsubscribe link is invalid." },
          { status: 404 },
        );
      }
      if (subscriber.unsubscribedAt) {
        return NextResponse.json({
          ok: true,
          message: "This address is already unsubscribed from the newsletters.",
        });
      }

      await db.subscriber.update({
        where: { id: subscriber.id },
        data: {
          verified: false,
          verifyToken: null,
          unsubscribedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "You have been unsubscribed from The Daily Post newsletters.",
      });
    }

    const email = parsed.data.email!;
    const subscriber = await db.subscriber.findUnique({ where: { email } });
    if (!subscriber || subscriber.unsubscribedAt) {
      return NextResponse.json(
        { ok: true, message: genericRequestMessage },
        { status: 202 },
      );
    }

    const unsubscribeToken = createNewsletterToken();
    await db.subscriber.update({
      where: { id: subscriber.id },
      data: { unsubscribeTokenHash: hashUnsubscribeToken(unsubscribeToken) },
    });

    const emailResult = await sendUnsubscribeEmail(email, unsubscribeToken);
    if (!emailResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "We couldn't send the unsubscribe link right now. Please try again later.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: genericRequestMessage,
        ...(emailResult.actionUrl ? { unsubscribeUrl: emailResult.actionUrl } : {}),
      },
      { status: 202 },
    );
  } catch (err) {
    logger.error({ err }, "[/api/unsubscribe] error");
    return NextResponse.json(
      { ok: false, error: "Unable to process this request. Please try again later." },
      { status: 500 },
    );
  }
}
