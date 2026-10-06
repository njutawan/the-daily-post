/**
 * Safe subset Markdown renderer shared by the editorial preview and the
 * public article page. Raw HTML is escaped before formatting is applied, and
 * links are restricted to HTTP(S), so database-authored Markdown is inert.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(value: string): string {
  let text = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+?)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-700 underline decoration-amber-300 underline-offset-2">$1</a>'
  );
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";
  const lines = escapeHtml(markdown).split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let inList = false;
  let inQuote = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) output.push(`<p>${inlineMarkdown(text)}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!inList) return;
    output.push("</ul>");
    inList = false;
  };
  const closeQuote = () => {
    if (!inQuote) return;
    output.push("</blockquote>");
    inQuote = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.startsWith("### ")) {
      flushParagraph();
      closeList();
      closeQuote();
      output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flushParagraph();
      closeList();
      closeQuote();
      output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      closeQuote();
      output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      if (!inQuote) {
        output.push("<blockquote>");
        inQuote = true;
      }
      output.push(`<p>${inlineMarkdown(line.slice(2))}</p>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      closeQuote();
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else if (!line.trim()) {
      flushParagraph();
      closeList();
      closeQuote();
    } else {
      closeList();
      closeQuote();
      paragraph.push(line);
    }
  }

  flushParagraph();
  closeList();
  closeQuote();
  return output.join("\n");
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
