import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit: 60 req/min per IP (root/health).
  const limited = rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  return NextResponse.json({ message: "Hello, world!" });
}