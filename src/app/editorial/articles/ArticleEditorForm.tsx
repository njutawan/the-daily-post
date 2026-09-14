"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, Save, Send } from "lucide-react";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABELS,
  type ArticleCategory,
} from "../types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderMarkdown, PREVIEW_CLASSNAME } from "../markdown";

interface ArticleEditorFormProps {
  mode: "create" | "edit";
  articleId?: string;
  initial?: {
    title?: string;
    excerpt?: string | null;
    body?: string | null;
    category?: string;
    tags?: string | null;
    heroImage?: string | null;
    heroCaption?: string | null;
  };
  /**
   * When true the form is rendered read-only and the save/submit buttons
   * are hidden. Used for published / archived articles that editors cannot
   * modify directly.
   */
  readOnly?: boolean;
  /**
   * Hide the "Save and submit for review" button. Used when the article is
   * in `pending_review` (already submitted) — editors can still save edits,
   * but the article moves back to draft and resubmission is a separate flow.
   */
  hideSubmit?: boolean;
  /**
   * Optional callback fired after a successful save in edit mode. Useful
   * for parent components that need to refresh server-fetched data.
   */
  onSaved?: () => void;
}

const EXCERPT_MAX = 500;

export function ArticleEditorForm({
  mode,
  articleId,
  initial,
  readOnly = false,
  hideSubmit = false,
  onSaved,
}: ArticleEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [category, setCategory] = useState<ArticleCategory>(
    (initial?.category as ArticleCategory) ?? "politics",
  );
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [heroImage, setHeroImage] = useState(initial?.heroImage ?? "");
  const [heroCaption, setHeroCaption] = useState(initial?.heroCaption ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  const wordCount = useMemo(() => {
    if (!body.trim()) return 0;
    return body.trim().split(/\s+/).length;
  }, [body]);

  const charCount = body.length;

  function buildPayload() {
    return {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      body,
      category,
      tags: tags.trim(),
      heroImage: heroImage.trim() || null,
      heroCaption: heroCaption.trim() || null,
    };
  }

  function validate(): string | null {
    if (title.trim().length < 3) return "Title must be at least 3 characters.";
    if (title.length > 200) return "Title must be 200 characters or fewer.";
    if (excerpt.length > EXCERPT_MAX) return `Excerpt must be ${EXCERPT_MAX} characters or fewer.`;
    if (heroImage && !isValidUrl(heroImage)) return "Hero image must be a valid URL.";
    return null;
  }

  async function handleSaveDraft() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving("draft");
    try {
      if (mode === "create") {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Failed to create draft");
          return;
        }
        toast.success("Draft created");
        router.push(`/editorial/articles/${data.article.id}/edit`);
        return;
      }
      // edit
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save changes");
        return;
      }
      toast.success("Saved");
      onSaved?.();
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(null);
    }
  }

  async function handleSubmitForReview() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (body.trim().length < 50) {
      toast.error("Body must be at least 50 characters before submission.");
      return;
    }
    setSaving("submit");
    try {
      let targetId = articleId;
      if (mode === "create") {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Failed to create draft");
          return;
        }
        targetId = data.article.id;
      } else {
        // Save latest changes first.
        const res = await fetch(`/api/articles/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Failed to save changes");
          return;
        }
      }
      const submitRes = await fetch(`/api/articles/${targetId}/submit`, {
        method: "POST",
      });
      const submitData = await submitRes.json().catch(() => ({}));
      if (!submitRes.ok) {
        toast.error(submitData.error ?? "Failed to submit for review");
        return;
      }
      toast.success("Submitted for admin review");
      if (mode === "create" && targetId) {
        router.push(`/editorial/articles/${targetId}/edit`);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(null);
    }
  }

  const previewHtml = useMemo(() => renderMarkdown(body), [body]);
  const disabled = readOnly || saving !== null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Headline <span className="text-rose-700">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          placeholder="A clear, specific headline — let readers know what the story is about"
          maxLength={200}
          className="font-headline text-lg font-semibold"
        />
        <div className="flex justify-between text-[11px] text-stone-500">
          <span>The headline appears at the top of the article and in social shares.</span>
          <span>{title.length}/200</span>
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <Label
          htmlFor="excerpt"
          className="text-[11px] uppercase tracking-[0.18em] text-stone-500"
        >
          Excerpt / Dek
        </Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          disabled={disabled}
          placeholder="A one-sentence summary that appears under the headline and in article cards."
          maxLength={EXCERPT_MAX}
          rows={3}
        />
        <div className="flex justify-end text-[11px] text-stone-500">
          <span className={excerpt.length > EXCERPT_MAX - 30 ? "text-amber-700" : ""}>
            {excerpt.length}/{EXCERPT_MAX}
          </span>
        </div>
      </div>

      {/* Category + Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Category
          </Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ArticleCategory)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a section" />
            </SelectTrigger>
            <SelectContent>
              {ARTICLE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Tags
          </Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={disabled}
            placeholder="comma, separated, tags"
          />
        </div>
      </div>

      {/* Hero image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="heroImage" className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Hero image URL
          </Label>
          <Input
            id="heroImage"
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            disabled={disabled}
            placeholder="https://…"
            type="url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroCaption" className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Hero caption
          </Label>
          <Input
            id="heroCaption"
            value={heroCaption}
            onChange={(e) => setHeroCaption(e.target.value)}
            disabled={disabled}
            placeholder="Photo credit and brief description"
          />
        </div>
      </div>

      {/* Body with live preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="body"
            className="text-[11px] uppercase tracking-[0.18em] text-stone-500"
          >
            Body (markdown)
          </Label>
          <span className="text-[11px] text-stone-500">
            <span className={wordCount < 50 ? "text-amber-700" : "text-stone-500"}>
              {wordCount} words
            </span>{" "}
            · {charCount} chars
          </span>
        </div>

        <Tabs defaultValue="write" className="w-full">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={disabled}
              placeholder={"# Write your story in markdown\n\nUse # for headings, **bold**, *italic*, > for blockquotes, and - for lists.\n\nMin 50 characters to submit for review."}
              rows={18}
              className="font-mono text-sm leading-relaxed min-h-[400px] resize-y"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[400px] rounded-md border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-950/40 p-5 overflow-auto">
              {body.trim() ? (
                <div
                  className={PREVIEW_CLASSNAME}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-sm text-stone-500 italic">
                  Nothing to preview yet — start typing in the Write tab.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={disabled}
            className="min-w-[140px]"
          >
            {saving === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === "create" ? "Save as draft" : "Save changes"}
          </Button>

          {!hideSubmit && (
            <Button
              onClick={handleSubmitForReview}
              disabled={disabled}
              className="bg-amber-700 text-white hover:bg-amber-800 min-w-[180px]"
            >
              {saving === "submit" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Save &amp; submit for review
            </Button>
          )}
        </div>
      )}

      {readOnly && (
        <div className="rounded-md border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-4 text-sm text-stone-600 dark:text-stone-400">
          Editing is disabled for this article status. Contact an admin if you
          need to make changes.
        </div>
      )}
    </div>
  );
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}
