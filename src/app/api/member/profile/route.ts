import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  byline: z.string().max(100).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

/**
 * PATCH /api/member/profile — update the current user's profile.
 *
 * Editors can set a byline (shown on their published articles).
 * Readers can set a display name, bio, and avatar.
 *
 * Email is NOT editable here — email changes must go through the auth
 * provider (Clerk dashboard or NextAuth's email verification flow).
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Only editors/admins can set a byline.
  if (parsed.data.byline !== undefined && user.role === "reader") {
    return NextResponse.json(
      { error: "Only editors and admins can set a byline" },
      { status: 403 }
    );
  }

  try {
    const updated = await db.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        byline: true,
        bio: true,
        avatarUrl: true,
        role: true,
        subTier: true,
        subStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "[api/member/profile] PATCH failed");
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
