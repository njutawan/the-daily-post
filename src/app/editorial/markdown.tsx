"use client";

/**
 * Tiny markdown → HTML renderer used by the article editor's "Preview" tab.
 * Intentionally minimal: covers headings, bold, italic, links, blockquotes,
 * and unordered lists — the subset of markdown editors actually type in a
 * news CMS. We escape HTML first so the rendered preview is XSS-safe even
 * when editors paste untrusted content.
 *
 * We avoid pulling in react-markdown / remark here to keep the editor
 * bundle light (the sandbox has a memory ceiling — heavier deps slow
 * compilation).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(s: string): string {
  // Inline code first to protect its contents.
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+?)__/g, "<strong>$1</strong>");
  // Italic (avoid touching the bold we just created — use a non-greedy match
  // and require a non-* neighbor on at least one side).
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");
  // Links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-700 underline decoration-amber-300 underline-offset-2">$1</a>',
  );
  return s;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const escaped = escapeHtml(md);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let inList = false;
  let inQuote = false;

  const flushPara = () => {
    if (para.length > 0) {
      const text = para.join(" ").trim();
      if (text) out.push(`<p>${inlineMarkdown(text)}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("### ")) {
      flushPara();
      closeList();
      closeQuote();
      out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flushPara();
      closeList();
      closeQuote();
      out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flushPara();
      closeList();
      closeQuote();
      out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      flushPara();
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inlineMarkdown(line.slice(2))}</p>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      closeQuote();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else if (line.trim() === "") {
      flushPara();
      closeList();
      closeQuote();
    } else {
      closeList();
      closeQuote();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  closeQuote();
  return out.join("\n");
}

export const PREVIEW_CLASSNAME =
  "font-body text-[15px] leading-relaxed text-stone-800 dark:text-stone-200 [&_h1]:font-headline [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-stone-900 [&_h1]:dark:text-stone-50 [&_h2]:font-headline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-stone-900 [&_h2]:dark:text-stone-50 [&_h3]:font-headline [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-stone-900 [&_h3]:dark:text-stone-50 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-stone-600 [&_blockquote]:dark:text-stone-400 [&_blockquote]:my-4 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:dark:bg-stone-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-mono [&_a]:text-amber-700";
