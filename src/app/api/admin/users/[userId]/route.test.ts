import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDb, mockRequireRole, mockRateLimit } = vi.hoisted(() => ({
  mockDb: { user: { findUnique: vi.fn(), update: vi.fn() } },
  mockRequireRole: vi.fn(),
  mockRateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth-unified", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  // The route uses the convenience wrapper; mirror its contract (null when
  // allowed, a 429 Response when limited) while staying driven by mockRateLimit.
  rateLimitResponse: vi.fn(async () => {
    const result = await mockRateLimit();
    return result && result.ok === false
      ? new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      : null;
  }),
}));

import { PATCH } from "./route";

function patch(body: unknown) {
  return new NextRequest("https://news.example/api/admin/users/reader-1", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "https://news.example" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" });
    mockRateLimit.mockReturnValue({ ok: true });
  });

  it("rejects manual subscription changes instead of granting entitlement", async () => {
    const response = await PATCH(patch({
      subTier: "allaccess",
      subStatus: "active",
      subExpiresAt: "2027-01-01T00:00:00.000Z",
    }), { params: Promise.resolve({ userId: "reader-1" }) });

    expect(response.status).toBe(400);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});
