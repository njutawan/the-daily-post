import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Input validation schemas (zod)", () => {
  // Subscribe schema
  const subscribeSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
    source: z.string().max(40).optional().default("homepage"),
  });

  it("validates a valid email + source", () => {
    const result = subscribeSchema.safeParse({
      email: "reader@example.com",
      source: "footer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("reader@example.com");
      expect(result.data.source).toBe("footer");
    }
  });

  it("defaults source to homepage when omitted", () => {
    const result = subscribeSchema.safeParse({ email: "test@test.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("homepage");
    }
  });

  it("rejects an invalid email", () => {
    const result = subscribeSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = subscribeSchema.safeParse({ source: "homepage" });
    expect(result.success).toBe(false);
  });

  // Comment schema
  const commentSchema = z.object({
    author: z.string().trim().min(1, "Please provide your name.").max(60),
    body: z.string().trim().min(2, "Comment is too short.").max(1000),
    parentId: z.string().max(60).optional().nullable(),
  });

  it("validates a valid comment", () => {
    const result = commentSchema.safeParse({
      author: "Jane",
      body: "Great article!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short comment body", () => {
    const result = commentSchema.safeParse({ author: "Jane", body: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing author", () => {
    const result = commentSchema.safeParse({ body: "Great!" });
    expect(result.success).toBe(false);
  });

  // Typo report schema
  const typoSchema = z.object({
    quotedText: z.string().trim().min(1).max(500),
    correction: z.string().trim().min(1).max(500),
    reporter: z.string().max(60).optional().default("anonymous"),
  });

  it("validates a valid typo report", () => {
    const result = typoSchema.safeParse({
      quotedText: "speling error",
      correction: "spelling error",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reporter).toBe("anonymous");
    }
  });

  it("rejects empty quotedText", () => {
    const result = typoSchema.safeParse({
      quotedText: "",
      correction: "fix",
    });
    expect(result.success).toBe(false);
  });
});
