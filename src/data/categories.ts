export const categories = [
  "Politics",
  "Opinions",
  "World",
  "Tech",
  "Business",
  "Climate",
  "Sports",
  "Culture",
  "Live",
];

const PUBLIC_CATEGORY_ALIASES: Record<string, string> = {
  opinion: "Opinions",
  opinions: "Opinions",
};

export function getPublicCategoryName(category: string): string {
  const normalized = category.trim().toLowerCase();
  const alias = PUBLIC_CATEGORY_ALIASES[normalized];
  if (alias) return alias;
  return categories.find((name) => name.toLowerCase() === normalized) ?? category;
}

export function getPublicCategorySlug(category: string): string {
  return getPublicCategoryName(category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
