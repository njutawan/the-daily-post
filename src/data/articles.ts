export type Article = {
  slug: string;
  title: string;
  deck: string; // sub-headline / summary
  category: string;
  author: string;
  authorTitle?: string;
  authorAvatar?: string; // initials rendered if absent
  time: string; // human readable, e.g. "3 hours ago"
  publishedAt: string; // ISO date
  readTime: number; // minutes
  imageUrl: string;
  imageCaption?: string;
  imageCredit?: string;
  body?: string[]; // paragraphs for detail page
  layout?: "hero" | "standard" | "compact" | "opinion";
  breaking?: boolean;
  live?: boolean;
  premium?: boolean; // subscriber-exclusive article
};

const img = {
  capitol1: "/images/capitol-1.jpg",
  capitol2: "/images/capitol-2.jpg",
  war1: "/images/war-1.jpg",
  war2: "/images/war-2.jpg",
  ai1: "/images/ai-1.jpg",
  ai2: "/images/ai-2.jpg",
  market1: "/images/market-1.jpeg",
  market2: "/images/market-2.jpg",
  climate1: "/images/climate-1.jpeg",
  climate2: "/images/climate-2.jpg",
  sports1: "/images/sports-1.jpg",
  sports2: "/images/sports-2.jpg",
  court1: "/images/court-1.jpg",
  court2: "/images/court-2.jpg",
  storm1: "/images/storm-1.jpg",
  storm2: "/images/storm-2.jpg",
  election1: "/images/election-1.jpg",
  election2: "/images/election-2.jpg",
  city1: "/images/city-1.jpg",
  city2: "/images/city-2.jpg",
  protest1: "/images/protest-1.jpg",
  protest2: "/images/protest-2.jpg",
  lab1: "/images/lab-1.jpg",
  lab2: "/images/lab-2.jpg",
};

export const leadArticle: Article = {
  slug: "senate-passes-landmark-infrastructure-bill",
  title: "Senate Approves Sweeping Infrastructure Bill in Late-Night Vote, Ending Months of Stalemate",
  deck:
    "The $1.2 trillion package — the largest public-works investment in a generation — now heads to the House, where moderate and progressive factions are already clashing over the timeline for a final vote.",
  category: "Politics",
  author: "Eleanor Whitfield",
  authorTitle: "Senior Congressional Correspondent",
  time: "37 minutes ago",
  publishedAt: "2026-09-09T04:12:00Z",
  readTime: 8,
  imageUrl: img.capitol1,
  imageCaption:
    "The Senate chamber erupted in brief applause after the gavel fell on the 68-32 vote shortly before midnight.",
  imageCredit: "Jabin Botsford / The Daily Post",
  layout: "hero",
  breaking: true,
  body: [
    "The Senate narrowly approved a sprawling, $1.2 trillion infrastructure package in a late-night vote Tuesday, ending months of bruising negotiations that at times threatened to derail President Catherine Reeves's signature domestic priority and cleave her party ahead of the midterms.",
    "The 68-to-32 vote — with 19 Republicans joining every Democrat in support — came after a marathon final day of debate in which senators traded barbs over the bill's cost, its climate provisions, and whether the country could afford to wait any longer to rebuild roads, bridges, and water systems that engineers have warned for years are in dangerous decline.",
    "If signed into law, the measure would represent the largest single investment in the nation's physical infrastructure since the construction of the interstate highway system in the 1950s. It directs roughly $110 billion toward roads and bridges, $66 billion to rail, $65 billion to the modernization of the electric grid, and $55 billion to replace lead water pipes that still serve millions of homes — many of them in communities that have lobbied for relief for more than a decade.",
    "\"This is what governing looks like when we put the country ahead of the next news cycle,\" said Majority Leader Sarah Hinton (D-Mich.), who has spent the better part of the summer brokering the compromise. \"Tonight we proved that the Senate can still do hard things.\"",
    "But the celebration on the Senate floor was almost certain to be short-lived. Within minutes of the gavel, House leaders were already signaling that the path ahead would be anything but smooth. A bloc of progressive members threatened to withhold their votes unless a separate, larger social-policy and climate package moves in tandem, while moderates from competitive districts pushed for a swift vote on the infrastructure bill alone.",
    "Outside the Capitol, the mood among advocates was one of cautious relief. Construction unions, mayors, and business groups that had pressed for the bill for months cheered the vote as a once-in-a-generation win. Environmental organizations, however, warned that the final text had been stripped of several ambitious climate measures — a concession that won Republican support but left some Democrats openly frustrated.",
    "The bill now moves to the House, where Speaker Marcus Delgado (D-Calif.) faces the delicate task of uniting a fractured caucus. Delgado told reporters late Tuesday that he intends to bring the measure to the floor \"as soon as is responsible,\" though he declined to commit to a specific timeline — a hesitation that some read as an acknowledgment of the fragile coalition he must hold together.",
    "For Reeves, the vote is both a political victory and a test of her party's ability to govern. The president, who called into the Senate cloakroom during the final hours of negotiation, released a statement praising the vote as \"proof that democracy can still deliver for working families.\" Whether voters feel that delivery by November remains the question that will define her first term.",
  ],
};

export const trendingStories: Article[] = [
  {
    slug: "supreme-court-encryption-case",
    title: "Justices Appear Split in Landmark Case Over Encrypted Messages and Privacy",
    deck:
      "Oral arguments suggest the court may be wrestling with how far the Fourth Amendment extends into the cloud.",
    category: "Politics",
    author: "Daniel Park",
    authorTitle: "Supreme Court Correspondent",
    time: "1 hour ago",
    publishedAt: "2026-09-09T03:40:00Z",
    readTime: 6,
    imageUrl: img.court1,
    layout: "compact",
    breaking: false,
  },
  {
    slug: "atlantic-hurricane-strengthens-category-4",
    title: "Hurricane Marlow Strengthens to Category 4 as Forecasters Warn of Record Surge",
    deck:
      "Coastal counties from the Carolinas to Virginia ordered mandatory evacuations ahead of a storm that forecasters called \"unprecedented in its speed.\"",
    category: "Climate",
    author: "Maya Brennan",
    authorTitle: "Climate and Environment Reporter",
    time: "2 hours ago",
    publishedAt: "2026-09-09T02:55:00Z",
    readTime: 5,
    imageUrl: img.storm1,
    layout: "compact",
    breaking: true,
  },
  {
    slug: "fed-pauses-rate-hikes",
    title: "Federal Reserve Holds Rates Steady, Signals Patience on Inflation Fight",
    deck:
      "Chair Jerome Powell said the central bank needs \"convincing evidence\" that price pressures are easing before resuming increases.",
    category: "Business",
    author: "Robert Kingsley",
    authorTitle: "Economics Editor",
    time: "3 hours ago",
    publishedAt: "2026-09-09T01:30:00Z",
    readTime: 4,
    imageUrl: img.market1,
    layout: "compact",
  },
  {
    slug: "ai-chip-export-controls",
    title: "White House Weighs Tighter Export Controls on Advanced AI Chips to Rivals",
    deck:
      "The proposed rules would extend restrictions to a wider class of semiconductors used to train large models.",
    category: "Tech",
    author: "Priya Nair",
    authorTitle: "Technology Correspondent",
    time: "5 hours ago",
    publishedAt: "2026-09-08T23:00:00Z",
    readTime: 7,
    imageUrl: img.ai1,
    layout: "compact",
  },
];

export const opinionPieces: Article[] = [
  {
    slug: "opinion-democracy-requires-maintenance",
    title: "Democracy Is Not a Machine That Runs Itself",
    deck:
      "We treat our institutions as if they were self-sustaining. They are not. They require us, every single day.",
    category: "Opinions",
    author: "Margaret Atwood-Lee",
    authorTitle: "Columnist",
    time: "4 hours ago",
    publishedAt: "2026-09-09T00:45:00Z",
    readTime: 5,
    imageUrl: img.protest1,
    layout: "opinion",
    body: [
      "There is a comforting fiction we tell ourselves in democracies: that the system, once built, will simply keep running. That the courts will keep adjudicating, the legislatures will keep legislating, and the people will keep voting — because that is what they have always done.",
      "But institutions, like bridges, are not self-sustaining. They erode. They corrode under the weather of human ambition and the slow acid of neglect. And when they finally fail, we are always surprised — as if no one could have foreseen the collapse of a structure that everyone agreed, in retrospect, had been creaking for years.",
      "What the framers understood, and what we have perhaps forgotten, is that democracy is a practice before it is a system. It is something you do, not something you have. The moment a citizen treats the ballot as a chore and the news as entertainment, the load-bearing wall begins to bow.",
      "We are not, despite the noise, at the edge of the cliff. But we are in a season of maintenance, and maintenance is unglamorous work. It is the long act of showing up.",
    ],
  },
  {
    slug: "opinion-the-cost-of-cheap-ai",
    title: "The Hidden Price of Cheap Intelligence",
    deck:
      "Every time we marvel at a model that writes a sonnet, we should ask what was spent to make it so.",
    category: "Opinions",
    author: "Dr. Hassan Yousef",
    authorTitle: "Contributing Opinion Writer",
    time: "6 hours ago",
    publishedAt: "2026-09-08T22:15:00Z",
    readTime: 6,
    imageUrl: img.ai2,
    layout: "opinion",
    body: [
      "There is a sleight of hand in the way we talk about artificial intelligence: we describe what it does and quietly omit what it costs. The costs are not only financial, though the financial figures are staggering. They are ecological, social, and — less measurable but no less real — epistemological.",
      "We are, at this moment, training systems that will shape what millions of people believe to be true. We are doing so on data we did not curate, using energy we did not budget for, and answering to no one in particular. This is not a technology policy. It is a governance vacuum.",
      "The question is not whether we should build these systems. We will. The question is whether we will do so with the seriousness the moment demands — or whether we will, as we have before, ask for forgiveness only after the bill comes due.",
    ],
  },
  {
    slug: "opinion-cities-after-the-office",
    title: "What Downtown Is For, Now That Nobody Has to Be There",
    deck:
      "The empty office tower is not a problem to be solved. It is a question to be answered about what a city is actually for.",
    category: "Opinions",
    author: "Celia Marchand",
    authorTitle: "Urban Affairs Columnist",
    time: "8 hours ago",
    publishedAt: "2026-09-08T20:30:00Z",
    readTime: 4,
    imageUrl: img.city1,
    layout: "opinion",
    body: [
      "For most of a century, the American downtown was organized around a single, unquestioned premise: people had to be there. The office was the gravity well, and everything else — the lunch counters, the transit lines, the rents — orbited around it.",
      "Remove that gravity, as the last few years have, and the entire system begins to drift. The question now is not how to drag people back to their desks. It is whether we have the imagination to build a downtown that people would actually choose to visit.",
    ],
  },
  {
    slug: "opinion-the-quiet-crisis-of-water",
    title: "The Coming Water Wars Are Already Here",
    deck:
      "We have spent a decade arguing about climate in the language of carbon. We may spend the next arguing in the language of thirst.",
    category: "Opinions",
    author: "Owen Castellano",
    authorTitle: "Climate Contributor",
    time: "11 hours ago",
    publishedAt: "2026-09-08T17:00:00Z",
    readTime: 5,
    imageUrl: img.climate1,
    layout: "opinion",
    body: [
      "In the river basins that feed the American West, the math has stopped working. There is less water than there are promises to deliver it, and the promises were made in a wetter century by people who assumed the rain would always come back.",
      "We have, for too long, treated water as a plumbing problem. It is, increasingly, a political one — and politics, as we have lately learned, is not a discipline known for its long planning horizons.",
    ],
  },
];

export const worldStories: Article[] = [
  {
    slug: "eastern-front-stalemate-deepens",
    title: "Eastern Front Settles Into a Grinding Stalemate as Winter Approaches",
    deck:
      "Commanders on both sides privately concede that neither a breakthrough nor a ceasefire appears likely before spring.",
    category: "World",
    author: "Anastasia Volkov",
    authorTitle: "Foreign Correspondent",
    time: "1 hour ago",
    publishedAt: "2026-09-09T03:10:00Z",
    readTime: 9,
    imageUrl: img.war1,
    layout: "standard",
    body: [
      "Along a muddy ridgeline in the eastern theater, the war has settled into the rhythm that soldiers here privately dread most: not the chaos of an offensive, but the slow, grinding monotony of a stalemate that neither side seems able to break.",
      "Commanders on both sides now concede, in conversations rarely repeated for the record, that neither a decisive breakthrough nor a negotiated ceasefire appears likely before the spring thaw. Artillery duels continue at a pace that has become almost routine. Drones hum overhead at all hours. And the casualties — though rarely acknowledged in official tallies — continue to mount.",
      "\"There is no victory in sight, and there is no peace in sight,\" a front-line officer said, speaking on the condition of anonymity because he was not authorized to discuss the situation. \"There is only the next day, and the day after that.\"",
      "Western officials, briefing reporters on the condition of anonymity, said they now expect the conflict to settle into a prolonged war of attrition through the winter, with both sides using the cold months to rebuild stockpiles and rotate exhausted units.",
      "For the civilians caught between the lines, the prospect of a frozen conflict offers little comfort. Aid agencies warn that the coming winter — the third of the war — will again test heating, electricity, and water systems that have already been pushed far past their limits.",
    ],
  },
  {
    slug: "global-tech-summit-regulation",
    title: "Global Summit Ends With Fragile Accord on AI Governance",
    deck:
      "More than 40 nations signed a framework document, but key provisions were watered down to secure agreement.",
    category: "Tech",
    author: "Priya Nair",
    authorTitle: "Technology Correspondent",
    time: "4 hours ago",
    publishedAt: "2026-09-09T00:00:00Z",
    readTime: 6,
    imageUrl: img.ai1,
    layout: "standard",
  },
  {
    slug: "markets-rally-on-fed-pause",
    title: "Markets Rally to Record Highs After Fed Signals Patience on Rates",
    deck:
      "The S&P 500 closed above 6,000 for the first time, buoyed by hopes that the central bank is done tightening.",
    category: "Business",
    author: "Robert Kingsley",
    authorTitle: "Economics Editor",
    time: "6 hours ago",
    publishedAt: "2026-09-08T22:00:00Z",
    readTime: 5,
    imageUrl: img.market2,
    layout: "standard",
  },
];

export const moreNews: Article[] = [
  {
    slug: "wildfires-force-evacuations-across-west",
    title: "Wildfires Force Largest Evacuation in a Decade Across Three Western States",
    deck: "Fire crews describe conditions unlike any they have seen, as winds push flames into populated areas.",
    category: "Climate",
    author: "Maya Brennan",
    authorTitle: "Climate and Environment Reporter",
    time: "2 hours ago",
    publishedAt: "2026-09-09T02:00:00Z",
    readTime: 5,
    imageUrl: img.climate2,
    layout: "compact",
  },
  {
    slug: "city-stadium-superbowl-host",
    title: "City Awarded Super Bowl in Narrow Vote, Promising a $500M Economic Bump",
    deck: "Officials celebrated, though independent economists urged caution about the projected windfall.",
    category: "Sports",
    author: "Terrence Mallow",
    authorTitle: "Sports Reporter",
    time: "3 hours ago",
    publishedAt: "2026-09-09T01:00:00Z",
    readTime: 4,
    imageUrl: img.sports1,
    layout: "compact",
  },
  {
    slug: "election-voter-turnout-primaries",
    title: "Voter Turnout Surges in Midterm Primaries, Shaping a Volatile November",
    deck: "Election officials report record participation in several battleground states.",
    category: "Politics",
    author: "Eleanor Whitfield",
    authorTitle: "Senior Congressional Correspondent",
    time: "5 hours ago",
    publishedAt: "2026-09-08T23:30:00Z",
    readTime: 6,
    imageUrl: img.election1,
    layout: "compact",
  },
  {
    slug: "biotech-lab-breakthrough-cure",
    title: "Researchers Report Breakthrough in a Long-Sought Cellular Therapy",
    deck: "A small trial showed dramatic remissions in a previously untreatable condition, though larger studies are needed.",
    category: "Tech",
    author: "Dr. Lillian Cho",
    authorTitle: "Science Correspondent",
    time: "7 hours ago",
    publishedAt: "2026-09-08T21:00:00Z",
    readTime: 7,
    imageUrl: img.lab1,
    layout: "compact",
  },
];

// Additional articles to enrich category pages and search results
export const additionalArticles: Article[] = [
  {
    slug: "governors-meet-climate-grid",
    title: "Western Governors Pledge a Unified Push to Harden the Power Grid",
    deck: "At a summit in Denver, leaders from 11 states agreed to coordinate on transmission lines and battery storage ahead of the wildfire season.",
    category: "Climate",
    author: "Maya Brennan",
    authorTitle: "Climate and Environment Reporter",
    time: "9 hours ago",
    publishedAt: "2026-09-08T19:00:00Z",
    readTime: 6,
    imageUrl: img.climate1,
    layout: "standard",
  },
  {
    slug: "drought-pact-colorado-river",
    title: "Seven States Reach Tense Agreement to Cut Colorado River Use",
    deck: "The deal averts immediate federal intervention but leaves unresolved how much each state must give up in the next decade.",
    category: "Climate",
    author: "Owen Castellano",
    authorTitle: "Climate Contributor",
    time: "12 hours ago",
    publishedAt: "2026-09-08T16:00:00Z",
    readTime: 5,
    imageUrl: img.climate2,
    layout: "standard",
  },
  {
    slug: "diplomatic-thaw-brussels-talks",
    title: "Diplomats Report Progress in Closed-Door Brussels Peace Talks",
    deck: "Officials familiar with the discussions say a humanitarian-corridor framework could be announced within days.",
    category: "World",
    author: "Anastasia Volkov",
    authorTitle: "Foreign Correspondent",
    time: "7 hours ago",
    publishedAt: "2026-09-08T21:00:00Z",
    readTime: 7,
    imageUrl: img.war2,
    layout: "standard",
  },
  {
    slug: "european-central-bank-rates",
    title: "European Central Bank Holds Rates as Recession Fears Deepen",
    deck: "The decision diverges from the Federal Reserve's pause, widening the trans-Atlantic policy gap.",
    category: "Business",
    author: "Robert Kingsley",
    authorTitle: "Economics Editor",
    time: "10 hours ago",
    publishedAt: "2026-09-08T18:00:00Z",
    readTime: 4,
    imageUrl: img.market1,
    layout: "standard",
  },
  {
    slug: "startup-ipo-revival",
    title: "After a Long Drought, the IPO Market Shows Signs of Life",
    deck: "Three high-profile filings this week suggest investors may be ready to welcome new public companies again.",
    category: "Business",
    author: "Priya Nair",
    authorTitle: "Technology Correspondent",
    time: "14 hours ago",
    publishedAt: "2026-09-08T14:00:00Z",
    readTime: 6,
    imageUrl: img.city2,
    layout: "standard",
  },
  {
    slug: "quantum-computing-milestone",
    title: "Researchers Cross a Long-Sought Quantum Computing Threshold",
    deck: "The result, still preliminary, would mark the first time a quantum machine outpaced classical rivals on a useful task.",
    category: "Tech",
    author: "Dr. Lillian Cho",
    authorTitle: "Science Correspondent",
    time: "13 hours ago",
    publishedAt: "2026-09-08T15:00:00Z",
    readTime: 8,
    imageUrl: img.lab1,
    layout: "standard",
    premium: true,
  },
  {
    slug: "social-media-content-moderation",
    title: "Inside the Scramble to Moderate an Election Year Online",
    deck: "Trust and safety teams describe a workforce stretched thin by a flood of AI-generated political content.",
    category: "Tech",
    author: "Priya Nair",
    authorTitle: "Technology Correspondent",
    time: "16 hours ago",
    publishedAt: "2026-09-08T12:00:00Z",
    readTime: 9,
    imageUrl: img.protest2,
    layout: "standard",
  },
  {
    slug: "congress-ai-oversight-hearing",
    title: "Lawmakers Spar Over How to Regulate AI Without Stifling It",
    deck: "A bipartisan hearing exposed deep disagreement over whether new rules should come from Congress or an independent agency.",
    category: "Politics",
    author: "Eleanor Whitfield",
    authorTitle: "Senior Congressional Correspondent",
    time: "15 hours ago",
    publishedAt: "2026-09-08T13:00:00Z",
    readTime: 7,
    imageUrl: img.ai2,
    layout: "standard",
    premium: true,
  },
  {
    slug: "governors-race-key-battleground",
    title: "Governor's Race in Key State Becomes a National Bellwether",
    deck: "Both parties are pouring resources into a contest that may preview the November electorate.",
    category: "Politics",
    author: "Eleanor Whitfield",
    authorTitle: "Senior Congressional Correspondent",
    time: "18 hours ago",
    publishedAt: "2026-09-08T10:00:00Z",
    readTime: 5,
    imageUrl: img.election2,
    layout: "standard",
    premium: true,
  },
  {
    slug: "world-cup-host-city-prepares",
    title: "Host City Races to Finish Stadium Before the World Cup Spotlight",
    deck: "Construction crews are working around the clock as inspectors arrive for a final readiness review.",
    category: "Sports",
    author: "Terrence Mallow",
    authorTitle: "Sports Reporter",
    time: "20 hours ago",
    publishedAt: "2026-09-08T08:00:00Z",
    readTime: 4,
    imageUrl: img.sports2,
    layout: "standard",
  },
  {
    slug: "quarterback-contract-record",
    title: "Star Quarterback Inks Record Extension, Reshaping the League's Market",
    deck: "The five-year deal resets the ceiling for the position and sends ripples through rival front offices.",
    category: "Sports",
    author: "Terrence Mallow",
    authorTitle: "Sports Reporter",
    time: "1 day ago",
    publishedAt: "2026-09-08T05:00:00Z",
    readTime: 3,
    imageUrl: img.sports1,
    layout: "standard",
  },
  {
    slug: "protest-capitol-democracy-reform",
    title: "Thousands Gather Outside Capitol to Demand Democracy Reform",
    deck: "Organizers said the rally was the largest of its kind in a decade, as lawmakers debated the very bill inside.",
    category: "World",
    author: "Daniel Park",
    authorTitle: "Supreme Court Correspondent",
    time: "1 day ago",
    publishedAt: "2026-09-08T03:00:00Z",
    readTime: 6,
    imageUrl: img.protest1,
    layout: "standard",
  },
];

export const allArticles: Article[] = [
  leadArticle,
  ...trendingStories,
  ...opinionPieces,
  ...worldStories,
  ...moreNews,
  ...additionalArticles,
];

export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: string): Article[] {
  return allArticles.filter((a) => a.category.toLowerCase() === category.toLowerCase());
}

export function searchArticles(query: string): Article[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allArticles.filter((a) => {
    const haystack = [a.title, a.deck, a.author, a.category, a.authorTitle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export type LiveUpdate = {
  id: string;
  time: string; // display time
  timestamp: string; // ISO
  title: string;
  body: string;
  author: string;
  highlight?: boolean;
  tag?: string;
};

export const liveUpdates: LiveUpdate[] = [
  {
    id: "lu-1",
    time: "12:42 a.m.",
    timestamp: "2026-09-09T04:42:00Z",
    title: "Senate gavels the bill through, 68-32",
    body: "Vice President Marcus Hale, presiding, announced the result to a largely empty chamber. Nineteen Republicans joined every Democrat in support. Applause was brief and muted.",
    author: "Eleanor Whitfield",
    highlight: true,
    tag: "Key vote",
  },
  {
    id: "lu-2",
    time: "12:18 a.m.",
    timestamp: "2026-09-09T04:18:00Z",
    title: "Final cloture vote clears 70-vote threshold",
    body: "The motion to end debate cleared with 71 votes, all but guaranteeing passage on the final up-or-down vote. Two senators did not vote.",
    author: "Eleanor Whitfield",
    tag: "Procedural",
  },
  {
    id: "lu-3",
    time: "11:50 p.m.",
    timestamp: "2026-09-09T03:50:00Z",
    title: "Majority Leader Hinton: 'We got it done'",
    body: "Speaking briefly off the floor, Hinton told a small pool of reporters that the compromise was 'not the bill any single senator wanted, but the bill the country needed.'",
    author: "Daniel Park",
    tag: "Reaction",
  },
  {
    id: "lu-4",
    time: "11:22 p.m.",
    timestamp: "2026-09-09T03:22:00Z",
    title: "White House prepares for a 10 a.m. Rose Garden address",
    body: "Officials say President Reeves will sign the bill 'as soon as it reaches the desk' and plans to mark the moment with a morning address. House leaders have not yet committed to a vote date.",
    author: "Eleanor Whitfield",
    tag: "What's next",
  },
  {
    id: "lu-5",
    time: "10:45 p.m.",
    timestamp: "2026-09-09T02:45:00Z",
    title: "Climate provisions scaled back to win GOP votes",
    body: "The final text drops several ambitious emissions measures that environmental groups had pressed for — a concession that drew sharp criticism from progressives even as it secured the Republican votes needed to break the filibuster.",
    author: "Maya Brennan",
    tag: "Analysis",
  },
  {
    id: "lu-6",
    time: "9:58 p.m.",
    timestamp: "2026-09-09T01:58:00Z",
    title: "Treasury: first dollars could flow within 60 days",
    body: "A senior Treasury official, briefing reporters on background, said the department has already drafted interim guidance for the road-and-bridge funds and expects the first grants to be announced by early November.",
    author: "Robert Kingsley",
    tag: "Implementation",
  },
  {
    id: "lu-7",
    time: "9:10 p.m.",
    timestamp: "2026-09-09T01:10:00Z",
    title: "Construction unions celebrate on the steps",
    body: "A few hundred workers gathered outside the Capitol cheered as word of the deal spread. 'We've been waiting on this for a decade,' one operating engineer said.",
    author: "Terrence Mallow",
    tag: "On the scene",
  },
];

export const categories = [
  "Politics",
  "Opinions",
  "World",
  "Tech",
  "Business",
  "Climate",
  "Sports",
  "Live",
];

export const categoryCounts = categories
  .filter((c) => c !== "Live")
  .map((c) => ({
    name: c,
    count: allArticles.filter((a) => a.category === c).length,
  }));
