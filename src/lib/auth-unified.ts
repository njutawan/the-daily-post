/**
 * Unified authentication — Clerk only.
 *
 * This module provides a single API for getting the current user and
 * enforcing role-based access. It uses Clerk exclusively — no demo
 * mode, no local cookie fallback.
 *
 * Roles:
 *   - reader   : default, anonymous or registered reader
 *   - editor   : can create/submit articles for admin review
 *   - admin    : can review articles, manage users, monitor payments
 *
 * Subscription tiers (separate from role):
 *   - free       : 3 free articles / month
 *   - digital    : unlimited digital access
 *   - allaccess  : digital + print + premium newsletters
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type Role = "reader" | "editor" | "admin";
export type SubTier = "free" | "digital" | "allaccess";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  subTier: SubTier;
  subStatus: string;
  subExpiresAt: Date | null;
  avatarUrl: string | null;
  clerkId: string | null;
}

const isClerkConfigured = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
};

/**
 * Get the current authenticated user from Clerk.
 * Returns null when signed out or Clerk is not configured.
 *
 * Note: this is a server-only function (uses next/headers).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isClerkConfigured()) {
    return null;
  }
  return getSessionUserClerk();
}

/**
 * Require the user to have one of the given roles. Returns the user
 * when authorized, otherwise null (caller should redirect or render 403).
 */
export async function requireRole(
  ...roles: Role[]
): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

// ─────────────────────────────────────────────────────────────
// Clerk backend
// ─────────────────────────────────────────────────────────────
async function getSessionUserClerk(): Promise<SessionUser | null> {
  try {
    // Lazy import so the build does not fail when Clerk keys are absent.
    const clerk = await import("@clerk/nextjs/server");
    const session = await clerk.auth();
    if (!session.userId) return null;

    const user = await clerk.currentUser();
    if (!user) return null;

    const email = user.primaryEmailAddress?.emailAddress ?? "";
    if (!email) return null;

    // Role is stored in Clerk publicMetadata.role (set by Clerk dashboard
    // or via the backend API). Default to "reader".
    const role = (user.publicMetadata.role as Role) || "reader";
    const subTier = (user.publicMetadata.subTier as SubTier) || "free";

    // Mirror the user into our local DB so foreign keys (Article.authorId,
    // Payment.userId, etc.) work.
    const dbUser = await db.user.upsert({
      where: { clerkId: session.userId },
      create: {
        clerkId: session.userId,
        email,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || email,
        role,
        subTier,
        avatarUrl: user.imageUrl,
      },
      update: {
        email,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || undefined,
        avatarUrl: user.imageUrl,
      },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as Role,
      subTier: dbUser.subTier as SubTier,
      subStatus: dbUser.subStatus,
      subExpiresAt: dbUser.subExpiresAt,
      avatarUrl: dbUser.avatarUrl,
      clerkId: dbUser.clerkId,
    };
  } catch (err) {
    logger.error({ err }, "[auth] Clerk session lookup failed");
    return null;
  }
}
