import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit: 60 req/min per IP (root/health).
  const limited = await rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  return NextResponse.json({ message: "Hello, world!" });
}