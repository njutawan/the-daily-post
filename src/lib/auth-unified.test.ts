import { afterEach, describe, expect, it } from "vitest";
import { getSessionUser, isUsingClerk, requireRole, requireUser } from "@/lib/auth-unified";

describe("unified authentication when Clerk is unavailable", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });

  it("reports Clerk as inactive and does not create an anonymous session", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    expect(isUsingClerk()).toBe(false);
    await expect(getSessionUser()).resolves.toBeNull();
    await expect(requireUser()).resolves.toBeNull();
  });

  it("denies every role when no user is authenticated", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    await expect(requireRole("reader")).resolves.toBeNull();
    await expect(requireRole("editor", "admin")).resolves.toBeNull();
  });
});
