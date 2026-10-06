import { afterEach, describe, expect, it, vi } from "vitest";

const { mockResendSend } = vi.hoisted(() => ({ mockResendSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockResendSend };
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { sendUnsubscribeEmail, sendVerificationEmail } from "@/lib/email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("newsletter email links", () => {
  it("points verification emails to the implemented /verify page with a token", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");

    const result = await sendVerificationEmail("reader@example.com", "verify-token", "unsubscribe-token");

    expect(result.ok).toBe(true);
    expect(result.actionUrl).toBeDefined();
    const url = new URL(result.actionUrl!);
    expect(url.pathname).toBe("/verify");
    expect(url.searchParams.get("token")).toBe("verify-token");
  });

  it("creates a separate unsubscribe confirmation link", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");

    const result = await sendUnsubscribeEmail("reader@example.com", "unsubscribe-token");

    expect(result.ok).toBe(true);
    expect(result.actionUrl).toBeDefined();
    const url = new URL(result.actionUrl!);
    expect(url.pathname).toBe("/unsubscribe");
    expect(url.searchParams.get("token")).toBe("unsubscribe-token");
  });

  it("sends through Resend using the configured verified sender", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "The Daily Post <newsletter@example.com>");
    mockResendSend.mockResolvedValue({ data: { id: "email-1" }, error: null });

    const result = await sendVerificationEmail("reader@example.com", "verify-token", "unsubscribe-token");

    expect(result).toMatchObject({ ok: true });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "The Daily Post <newsletter@example.com>",
        to: "reader@example.com",
        subject: "Confirm your subscription to The Daily Post",
        html: expect.stringContaining("/verify?token=verify-token"),
      })
    );
    expect(mockResendSend.mock.calls[0][0].html).toContain("/unsubscribe?token=unsubscribe-token");
  });

  it("does not report success when Resend returns an error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "The Daily Post <newsletter@example.com>");
    mockResendSend.mockResolvedValue({ data: null, error: { message: "sender not verified" } });

    const result = await sendVerificationEmail("reader@example.com", "verify-token", "unsubscribe-token");

    expect(result.ok).toBe(false);
  });
});
