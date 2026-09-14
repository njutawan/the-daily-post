import { z } from "zod";

/** Validation schemas shared across API routes. */

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  source: z.string().trim().max(40).optional().default("homepage"),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const commentSchema = z.object({
  author: z.string().trim().min(1, "Please provide your name.").max(60),
  body: z.string().trim().min(2, "Comment is too short.").max(1000),
  parentId: z.string().max(60).optional().nullable(),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const typoSchema = z.object({
  quotedText: z.string().trim().min(1, "Please select the text with the typo.").max(500),
  correction: z.string().trim().min(1, "Please suggest a correction.").max(500),
  reporter: z.string().max(60).optional().default("anonymous"),
});
export type TypoInput = z.infer<typeof typoSchema>;

export const commentActionSchema = z.object({
  commentId: z.string().min(1).max(60),
  reason: z.enum(["spam", "harassment", "misinformation", "off-topic", "other"]).optional(),
  reporter: z.string().max(60).optional().default("anonymous"),
});
export type CommentActionInput = z.infer<typeof commentActionSchema>;

export const commentEditSchema = z.object({
  commentId: z.string().min(1).max(60),
  body: z.string().trim().min(2, "Comment is too short.").max(1000),
});
export type CommentEditInput = z.infer<typeof commentEditSchema>;

export const ttsSchema = z.object({
  text: z.string().min(1, "Text is required.").max(10000),
  voice: z.string().optional().default("tongtong"),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
  mode: z.enum(["preview", "full"]).optional().default("preview"),
});
export type TTSInput = z.infer<typeof ttsSchema>;

export const readingSchema = z.object({
  scrollDepth: z.number().min(0).max(100).optional().default(0),
  timeOnPage: z.number().min(0).max(7200).optional().default(0),
});
export type ReadingInput = z.infer<typeof readingSchema>;
