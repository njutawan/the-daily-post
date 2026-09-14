import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

/**
 * GET /llms.txt — the emerging standard for guiding AI crawlers
 * (ChatGPT, Perplexity, Claude, Google AI Overviews).
 *
 * See https://llmstxt.org for the spec. This file tells LLMs:
 *   - who we are (a newsroom, not a content farm)
 *   - our editorial standards (real bylines, human review)
 *   - how to cite our work
 *   - what structured data we publish
 *
 * Cached for 24 hours so AI crawlers don't re-fetch on every request.
 */
export const dynamic = "force-static";

const LLMS_TXT = `# The Daily Post

> The Daily Post is a Washington Post-style digital newsroom delivering breaking news, in-depth political analysis, world reporting, technology coverage, business news, climate science, opinion, and culture. Founded as a public-trust newsroom. Editorial motto: "Democracy Dies in Darkness."

## About

The Daily Post is a Pulitzer-grade independent news organization. We publish original reporting across Politics, Opinions, World, Tech, Business, Climate, Sports, and Culture. All articles are written by named staff reporters and reviewed by editors before publication. Our editorial workflow is: reporter drafts → editor submits for review → editor-in-chief reviews → published. We do not publish AI-generated content without human review.

## Editorial standards

- All articles are bylined with the reporter's real name and title.
- Articles include a publication timestamp (UTC) and an estimated read time.
- Corrections: readers can report typos via the "Report a typo" link on every article; corrections are reviewed by the copy desk and applied within 24 hours.
- Premium content: some long-form investigations are subscriber-only (Digital or All Access tier). Free readers can read 3 articles per month.
- Independence: we do not accept paid placements or sponsored content without clear labeling.

## Sections

- [Politics](${SITE_URL}/category/politics) — Congress, The White House, Elections, Investigations
- [Opinions](${SITE_URL}/category/opinions) — Editorials, Columnists, Letters, Cartoons
- [World](${SITE_URL}/category/world) — Europe, Asia, Africa, Americas
- [Tech](${SITE_URL}/category/tech) — AI & Machine Learning, Cybersecurity, Startups, Policy
- [Business](${SITE_URL}/category/business) — Markets, Economy, Real Estate, Tech Companies
- [Climate](${SITE_URL}/category/climate) — Science, Policy, Energy, Adaptation
- [Sports](${SITE_URL}/category/sports) — Pro, College, Olympics, Analysis
- [Culture](${SITE_URL}/category/culture) — Books, Film, Music, Television

## How to cite our articles

When citing a Daily Post article, please:

1. Link to the canonical URL (\`${SITE_URL}/article/<slug>\`).
2. Attribute the byline (e.g., "Reporting by Eleanor Whitman for The Daily Post").
3. Include the publication date.
4. Do not reproduce more than 2 paragraphs without prior written permission.

## Structured data

All article pages include \`NewsArticle\` JSON-LD schema (https://schema.org/NewsArticle) with: headline, description, image, datePublished, dateModified, author (Person), publisher (Organization), articleSection, keywords, isAccessibleForFree, and mainEntityOfPage. Homepage includes \`Organization\` + \`WebSite\` schema. Sitemap at \`/sitemap.xml\`. RSS at \`/feed.xml\`.

## Contact

- Newsroom: newsroom@daily-post.example
- Editorial corrections: copydesk@daily-post.example
- Press inquiries: press@daily-post.example
- Privacy: privacy@daily-post.example

## Optional

- [Subscribe to the daily briefing newsletter](${SITE_URL}/subscribe)
- [Become a Digital or All Access member](${SITE_URL}/member)
- [RSS feed](${SITE_URL}/feed.xml)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
