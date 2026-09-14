/**
 * One-time seed for demo articles used by the editor / admin dashboards.
 *
 * Run: `bun run src/lib/seed-articles.ts` (executed via the
 * `seed:articles` npm script). Safe to re-run — it upserts by slug.
 */

import { db } from "@/lib/db";

async function main() {
  console.log("Seeding demo articles…");

  // Ensure seed users exist for the editorial/admin dashboards.
  const editor = await db.user.upsert({
    where: { email: "demo.editor@daily-post.test" },
    create: {
      email: "demo.editor@daily-post.test",
      name: "Eleanor Whitman",
      role: "editor",
      subTier: "digital",
      byline: "Eleanor Whitman",
    },
    update: { name: "Eleanor Whitman", byline: "Eleanor Whitman" },
  });

  const admin = await db.user.upsert({
    where: { email: "demo.admin@daily-post.test" },
    create: {
      email: "demo.admin@daily-post.test",
      name: "Marcus Holloway",
      role: "admin",
      subTier: "allaccess",
      byline: "Marcus Holloway",
    },
    update: { name: "Marcus Holloway", byline: "Marcus Holloway" },
  });

  // A few "reader" subscribers so the admin dashboard has data.
  const readerEmails = [
    "ava.kapoor@example.com",
    "liam.fischer@example.com",
    "noor.rashid@example.com",
    "sven.larsson@example.com",
    "maya.tanaka@example.com",
  ];
  for (const email of readerEmails) {
    await db.user.upsert({
      where: { email },
      create: {
        email,
        name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        role: "reader",
        subTier: ["digital", "allaccess", "free", "digital", "free"][readerEmails.indexOf(email)],
        subStatus: "active",
      },
      update: {},
    });
  }

  const articles = [
    {
      slug: "white-house-unveils-ai-executive-order",
      title: "White House Unveils Sweeping AI Executive Order",
      excerpt:
        "The order tasks federal agencies with auditing high-risk AI systems and directs NIST to publish safety benchmarks within 90 days.",
      body: `# White House Unveils Sweeping AI Executive Order\n\nThe order tasks federal agencies with auditing high-risk AI systems and directs NIST to publish safety benchmarks within 90 days.\n\nOfficials described the move as the most aggressive federal intervention in artificial intelligence to date, drawing praise from civil society and pushback from industry groups worried about competitiveness.`,
      category: "politics",
      tags: "ai,white house,regulation,technology",
      status: "draft",
      authorId: editor.id,
    },
    {
      slug: "supreme-court-takes-up-landmark-encryption-case",
      title: "Supreme Court Takes Up Landmark Encryption Case",
      excerpt:
        "Justices will decide whether device makers can be compelled to break their own encryption under national security exceptions.",
      body: `# Supreme Court Takes Up Landmark Encryption Case\n\nJustices will decide whether device makers can be compelled to break their own encryption under national security exceptions.\n\nThe case, argued Tuesday, tests the boundary between user privacy and law enforcement access.`,
      category: "politics",
      tags: "supreme court,encryption,privacy",
      status: "pending_review",
      authorId: editor.id,
    },
    {
      slug: "global-markets-rally-on-inflation-data",
      title: "Global Markets Rally on Softer-Than-Expected Inflation Data",
      excerpt:
        "The S&P 500 closed up 1.8% after the CPI report showed prices rose just 0.1% month-over-month.",
      body: `# Global Markets Rally on Softer-Than-Expected Inflation Data\n\nThe S&P 500 closed up 1.8% after the CPI report showed prices rose just 0.1% month-over-month.\n\nBond yields slipped and the dollar weakened as traders bet the Federal Reserve would hold rates steady at its next meeting.`,
      category: "business",
      tags: "markets,inflation,federal reserve",
      status: "pending_review",
      authorId: editor.id,
    },
    {
      slug: "california-wildfires-force-evacuations",
      title: "California Wildfires Force 30,000 to Evacuate",
      excerpt:
        "Fire crews battled more than a dozen active blazes across the Sierra Nevada foothills amid record heat.",
      body: `# California Wildfires Force 30,000 to Evacuate\n\nFire crews battled more than a dozen active blazes across the Sierra Nevada foothills amid record heat.\n\nOfficials warned that the peak fire season is still weeks away.`,
      category: "climate",
      tags: "wildfires,california,climate",
      status: "published",
      authorId: editor.id,
      reviewerId: admin.id,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      viewCount: 4287,
      commentCount: 53,
    },
    {
      slug: "the-case-for-a-shorter-workweek",
      title: "Opinion: The Case for a Shorter Workweek",
      excerpt:
        "A growing body of evidence suggests that four-day weeks boost productivity, well-being, and even retention.",
      body: `# The Case for a Shorter Workweek\n\nA growing body of evidence suggests that four-day weeks boost productivity, well-being, and even retention.\n\nWhat's stopping us? Mostly inertia, and a culture that equates hours with commitment.`,
      category: "opinion",
      tags: "work,productivity,opinion",
      status: "published",
      authorId: editor.id,
      reviewerId: admin.id,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      viewCount: 9241,
      commentCount: 187,
      featured: true,
    },
    {
      slug: "new-mars-rover-beams-back-first-images",
      title: "New Mars Rover Beams Back First High-Resolution Images",
      excerpt:
        "The rover's color cameras captured layered sediments that scientists say may hold clues to ancient water.",
      body: `# New Mars Rover Beams Back First High-Resolution Images\n\nThe rover's color cameras captured layered sediments that scientists say may hold clues to ancient water.\n\nMission scientists described the imagery as the most detailed ever returned from the Martian surface.`,
      category: "tech",
      tags: "mars,nasa,space,science",
      status: "rejected",
      authorId: editor.id,
      reviewerId: admin.id,
      reviewNotes: "Need to verify the photo caption attribution and the launch date in paragraph 2.",
    },
  ];

  for (const a of articles) {
    await db.article.upsert({
      where: { slug: a.slug },
      create: a,
      update: {},
    });
  }

  console.log(`Seeded ${articles.length} articles for editor "${editor.email}".`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
