import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockArticleReads, transactionClient } = vi.hoisted(() => {
  const rows: Array<{ meterKey: string; articleSlug: string; month: string }> = [];
  const tx = {
    articleMeterRead: {
      findMany: vi.fn(async (args: { where: { meterKey: { in: string[] }; month: string } }) =>
        rows.filter((row) => args.where.meterKey.in.includes(row.meterKey) && row.month === args.where.month)
          .map((row) => ({ articleSlug: row.articleSlug })),
      ),
      upsert: vi.fn(async (args: {
        where: { meterKey_articleSlug_month: { meterKey: string; articleSlug: string; month: string } };
        create: { meterKey: string; articleSlug: string; month: string };
      }) => {
        const row = args.create;
        if (!rows.some((item) => item.meterKey === row.meterKey && item.articleSlug === row.articleSlug && item.month === row.month)) {
          rows.push(row);
        }
        return row;
      }),
    },
  };
  const db = {
    user: { findUnique: vi.fn() },
    payment: { findFirst: vi.fn() },
    articleMeterRead: tx.articleMeterRead,
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { mockDb: db, mockArticleReads: rows, transactionClient: tx };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { getArticleAccess } from "./paywall";

const now = new Date("2026-10-06T10:00:00.000Z");
const headers = new Headers({
  "x-forwarded-for": "203.0.113.20",
  "user-agent": "Paywall test browser",
  "accept-language": "en-US",
});

const guestOptions = (slug: string, isPremium = false) => ({
  slug,
  isPremium,
  sessionUser: null,
  requestHeaders: headers,
  now,
});

const sessionUser = {
  id: "reader-account-1",
  email: "reader@example.com",
  name: "Reader",
  role: "reader" as const,
  subTier: "free" as const,
  subStatus: "active",
  subExpiresAt: null,
  avatarUrl: null,
  clerkId: "clerk-reader-1",
};

const accountOptions = (slug: string, requestHeaders: Headers) => ({
  ...guestOptions(slug),
  sessionUser,
  requestHeaders,
});

describe("server-side article metering", () => {
  beforeEach(() => {
    mockArticleReads.splice(0, mockArticleReads.length);
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("PAYWALL_CLIENT_IP_HEADER", "");
    vi.stubEnv("PAYWALL_METER_SECRET", "paywall-test-secret");
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.payment.findFirst.mockResolvedValue(null);
    mockDb.$transaction.mockImplementation(async (callback) => callback(transactionClient));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows three unique free articles and gates the next one", async () => {
    expect((await getArticleAccess(guestOptions("story-one"))).allowed).toBe(true);
    expect((await getArticleAccess(guestOptions("story-two"))).allowed).toBe(true);
    const third = await getArticleAccess(guestOptions("story-three"));
    expect(third).toMatchObject({ allowed: true, readCount: 3, remaining: 0, limit: 3 });

    const fourth = await getArticleAccess(guestOptions("story-four"));
    expect(fourth).toMatchObject({ allowed: false, readCount: 3, remaining: 0, reason: "metered" });
  });

  it("does not count a repeat view of the same article twice in a month", async () => {
    await getArticleAccess(guestOptions("story-one"));
    const repeat = await getArticleAccess(guestOptions("story-one"));

    expect(repeat).toMatchObject({ allowed: true, readCount: 1, remaining: 2 });
  });

  it("gates premium articles immediately without recording a free read", async () => {
    const access = await getArticleAccess(guestOptions("premium-story", true));

    expect(access).toMatchObject({ allowed: false, reason: "premium", limit: 3 });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockArticleReads).toHaveLength(0);
  });

  it("grants premium access only when a succeeded invoice matches the current subscription", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: sessionUser.id,
      role: "reader",
      subTier: "digital",
      subStatus: "active",
      subExpiresAt: new Date("2026-11-06T00:00:00.000Z"),
      stripeSubscriptionId: "sub_paid_123",
    });

    const withoutPaidInvoice = await getArticleAccess({
      slug: "premium-story",
      isPremium: true,
      sessionUser,
      requestHeaders: headers,
      now,
    });
    expect(withoutPaidInvoice).toMatchObject({ allowed: false, reason: "premium" });
    expect(mockDb.payment.findFirst).toHaveBeenCalledWith({
      where: {
        userId: sessionUser.id,
        provider: "stripe",
        status: "succeeded",
        stripeSubscriptionId: "sub_paid_123",
      },
      select: { id: true },
    });

    mockDb.payment.findFirst.mockResolvedValue({ id: "payment-1" });
    const withPaidInvoice = await getArticleAccess({
      slug: "premium-story",
      isPremium: true,
      sessionUser,
      requestHeaders: headers,
      now,
    });
    expect(withPaidInvoice).toMatchObject({ allowed: true, reason: "subscriber" });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("uses Vercel's platform client-IP header instead of spoofable forwarding headers", async () => {
    vi.stubEnv("VERCEL", "1");
    const firstHeaders = new Headers({
      "x-vercel-forwarded-for": "203.0.113.21",
      "x-forwarded-for": "198.51.100.10",
    });
    const secondHeaders = new Headers({
      "x-vercel-forwarded-for": "203.0.113.21",
      "x-forwarded-for": "198.51.100.99",
    });

    await getArticleAccess({ ...guestOptions("story-one"), requestHeaders: firstHeaders });
    const second = await getArticleAccess({ ...guestOptions("story-two"), requestHeaders: secondHeaders });

    expect(second).toMatchObject({ allowed: true, readCount: 2, remaining: 1 });
  });

  it("carries guest reads into the account meter before a user changes IPs", async () => {
    await getArticleAccess(guestOptions("story-one"));
    await getArticleAccess(guestOptions("story-two"));
    await getArticleAccess(guestOptions("story-three"));
    mockDb.user.findUnique.mockResolvedValue({
      id: sessionUser.id,
      role: "reader",
      subTier: "free",
      subStatus: "active",
      subExpiresAt: null,
      stripeSubscriptionId: null,
    });

    const sameIp = await getArticleAccess(accountOptions("story-four", headers));
    const newIp = await getArticleAccess(accountOptions("story-four", new Headers({
      "x-forwarded-for": "203.0.113.88",
    })));

    expect(sameIp).toMatchObject({ allowed: false, readCount: 3, reason: "metered" });
    expect(newIp).toMatchObject({ allowed: false, readCount: 3, reason: "metered" });
  });

  it("requires a trusted single-IP header on non-Vercel production hosts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYWALL_CLIENT_IP_HEADER", "x-proxy-client-ip");
    const firstHeaders = new Headers({
      "x-proxy-client-ip": "203.0.113.31",
      "x-forwarded-for": "198.51.100.10",
    });
    const secondHeaders = new Headers({
      "x-proxy-client-ip": "203.0.113.31",
      "x-forwarded-for": "198.51.100.99",
    });

    await getArticleAccess({ ...guestOptions("story-one"), requestHeaders: firstHeaders });
    const second = await getArticleAccess({ ...guestOptions("story-two"), requestHeaders: secondHeaders });

    expect(second).toMatchObject({ allowed: true, readCount: 2, remaining: 1 });
  });

  it("fails closed when production has no trusted client-IP source", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const spoofableOnly = new Headers({ "x-forwarded-for": "203.0.113.44" });

    await expect(
      getArticleAccess({ ...guestOptions("story-one"), requestHeaders: spoofableOnly }),
    ).rejects.toThrow(/trusted client-IP header/);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("rejects multi-IP proxy header values rather than guessing the trusted hop", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYWALL_CLIENT_IP_HEADER", "x-proxy-client-ip");
    const malformed = new Headers({
      "x-proxy-client-ip": "203.0.113.44, 10.0.0.2",
    });

    await expect(
      getArticleAccess({ ...guestOptions("story-one"), requestHeaders: malformed }),
    ).rejects.toThrow(/Missing or invalid trusted client IP/);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("uses a monthly key so a new calendar month starts a fresh allowance", async () => {
    await getArticleAccess(guestOptions("story-one"));
    const nextMonth = await getArticleAccess({
      ...guestOptions("story-two"),
      now: new Date("2026-11-01T00:00:00.000Z"),
    });

    expect(nextMonth).toMatchObject({ allowed: true, readCount: 1, remaining: 2 });
  });
});
