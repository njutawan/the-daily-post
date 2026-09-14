import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ADMIN_PASSWORD } from "@/lib/env";
import { rateLimitResponse } from "@/lib/rate-limit";

const ADMIN_COOKIE = "tdp-admin-token";
const isProduction = process.env.NODE_ENV === "production";

export const runtime = "nodejs";

/**
 * Generate an HMAC-SHA256 of the admin password to use as the cookie
 * value. This way the plaintext password is NEVER stored in the cookie —
 * even if the cookie leaks (XSS, logs, browser extension), the attacker
 * only gets the HMAC, not the password itself.
 */
function adminToken(): string {
  return crypto.createHmac("sha256", ADMIN_PASSWORD).digest("hex");
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 login attempts per minute per IP (prevent brute-force)
  const limited = rateLimitResponse(req, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ ok: false, error: "Password required." }, { status: 422 });
  }

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Store an HMAC of the password (NOT the plaintext password) in the
  // cookie. If the cookie leaks, the attacker only gets the HMAC,
  // not the password itself.
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
