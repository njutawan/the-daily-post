/**
 * Lightweight Named Entity Recognition (NER) for SEO/GEO structured data.
 *
 * Production would use a proper NER model (spaCy, GPT, or Cloud Natural
 * Language API) but a regex-based extractor is good enough for the
 * `about` field on NewsArticle schema — it surfaces the people,
 * organizations, and locations mentioned in the body so AI engines
 * (Google AI Overviews, ChatGPT, Perplexity) can extract entities for
 * citation without an external API call.
 *
 * The heuristics:
 *   - PERSON: "Title-Case Name Name" (1–3 capitalized words, common
 *     honorifics like Dr./Mr./Ms./Sen./Gov./President allowed).
 *   - ORGANIZATION: "The X" or all-caps acronyms 2–6 letters, or
 *     Title-Case names containing words like "Inc", "Corp", "Company",
 *     "Department", "Bureau", "Agency", "Court", "University".
 *   - LOCATION: known country/city/state names + Title-Case words
 *     followed by common location suffixes (City, State, Country, River,
 *     Mountains, Ocean).
 *
 * Returns de-duplicated entities, capped at 10 to avoid schema bloat.
 */

export type EntityType = "Person" | "Organization" | "Place";
export interface DetectedEntity {
  "@type": EntityType;
  name: string;
}

const HONORIFICS = new Set([
  "Mr", "Mrs", "Ms", "Dr", "Prof", "Sen", "Sen.",
  "Gov", "President", "Rep", "Sen", "Mayor", "Judge",
  "Ambassador", "Secretary", "General", "Colonel",
]);

const ORG_KEYWORDS = new Set([
  "Inc", "Inc.", "Corp", "Corp.", "Company", "Co.", "Co",
  "Department", "Dept", "Bureau", "Agency", "Authority",
  "Court", "University", "Institute", "Foundation",
  "Organization", "Council", "Commission", "Committee",
  "Bank", "Group", "Holdings", "Partners", "Ventures",
  "Studios", "Pictures", "News", "Post", "Times", "Journal",
]);

const KNOWN_LOCATIONS = new Set([
  // Countries
  "United States", "America", "USA", "China", "Russia", "Ukraine",
  "Israel", "Palestine", "Iran", "Iraq", "Afghanistan", "Pakistan",
  "India", "Japan", "South Korea", "North Korea", "Taiwan",
  "Germany", "France", "United Kingdom", "Britain", "Italy", "Spain",
  "Poland", "Sweden", "Norway", "Finland", "Denmark", "Netherlands",
  "Belgium", "Switzerland", "Austria", "Greece", "Turkey",
  "Mexico", "Canada", "Brazil", "Argentina", "Chile", "Colombia",
  "Egypt", "South Africa", "Nigeria", "Kenya", "Ethiopia",
  "Saudi Arabia", "UAE", "Qatar", "Indonesia", "Vietnam",
  "Philippines", "Thailand", "Malaysia", "Singapore", "Australia",
  "New Zealand",
  // US States
  "California", "Texas", "Florida", "New York", "Pennsylvania",
  "Illinois", "Ohio", "Georgia", "Michigan", "Washington",
  "Arizona", "Massachusetts", "Virginia", "Colorado", "Oregon",
  // Major cities
  "Washington", "New York City", "Los Angeles", "Chicago", "Houston",
  "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas",
  "San Francisco", "Seattle", "Boston", "Atlanta", "Miami",
  "Denver", "Las Vegas", "Portland", "Sacramento",
  "London", "Paris", "Berlin", "Madrid", "Rome", "Brussels",
  "Amsterdam", "Stockholm", "Oslo", "Helsinki", "Copenhagen",
  "Dublin", "Vienna", "Prague", "Warsaw", "Budapest",
  "Tokyo", "Beijing", "Shanghai", "Seoul", "Taipei",
  "Hong Kong", "Singapore", "Bangkok", "Mumbai", "Delhi",
  "Karachi", "Islamabad", "Tehran", "Baghdad", "Damascus",
  "Jerusalem", "Tel Aviv", "Cairo", "Istanbul", "Moscow",
  "Kyiv", "Saint Petersburg",
]);

// Suffixes that strongly indicate a location
const LOCATION_SUFFIXES = new Set([
  "City", "State", "Country", "River", "Mountain", "Mountains",
  "Ocean", "Sea", "Gulf", "Lake", "Valley", "County",
  "Province", "Region", "Desert", "Island", "Peninsula",
]);

const PERSON_SUFFIXES = new Set([
  "Jr", "Jr.", "Sr", "Sr.", "II", "III", "IV",
]);

/**
 * Detect entities in a text body. Returns a de-duplicated, capped list.
 *
 * @param text the article body (HTML-stripped)
 * @param cap max entities to return (default 10)
 */
export function detectEntities(
  text: string,
  cap = 10
): DetectedEntity[] {
  if (!text) return [];

  const found = new Map<string, EntityType>();
  const cleaned = text.replace(/\s+/g, " ");

  // --- 1. Known locations (exact match against the curated list) ---
  for (const loc of KNOWN_LOCATIONS) {
    // Word-boundary match so "Washington" doesn't match "Washingtonville"
    const re = new RegExp(`\\b${escapeRegex(loc)}\\b`, "g");
    if (re.test(cleaned)) {
      found.set(loc, "Place");
    }
  }

  // --- 2. Title-case proper noun phrases (1–3 words) ---
  // Match: optional honorific + 1–3 capitalized words + optional suffix
  const titleCaseRe =
    /(?:(?:Mr|Mrs|Ms|Dr|Prof|Sen|Gov|President|Rep|Mayor|Judge|Ambassador|Secretary|General)\.\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+(Jr|Sr|II|III|IV)\.?)?/g;

  let m: RegExpExecArray | null;
  while ((m = titleCaseRe.exec(cleaned)) !== null) {
    const phrase = m[0].replace(/\s+/g, " ").trim();
    const words = phrase.split(" ");

    // Honorific → almost certainly a person
    if (/^(Mr|Mrs|Ms|Dr|Prof|Sen|Gov|President|Rep|Mayor|Judge|Ambassador|Secretary|General)\./.test(phrase)) {
      found.set(stripHonorific(phrase), "Person");
      continue;
    }

    // Org keyword → Organization
    if (words.some((w) => ORG_KEYWORDS.has(w.replace(/\.$/, "")))) {
      found.set(phrase, "Organization");
      continue;
    }

    // Location suffix → Place
    if (words.some((w) => LOCATION_SUFFIXES.has(w))) {
      found.set(phrase, "Place");
      continue;
    }

    // 2–3 word Title-Case phrase → likely a Person ( FullName ) or Org ( FullName Inc )
    if (words.length >= 2) {
      // Heuristic: if the last word is a known person-suffix (Jr, III), person.
      if (words.some((w) => PERSON_SUFFIXES.has(w.replace(/\.$/, "")))) {
        found.set(phrase, "Person");
        continue;
      }
      // Heuristic: if all words look like Given+Surname capitalization
      // (no articles/prepositions), treat as Person.
      if (words.every((w) => /^[A-Z][a-z]+$/.test(w))) {
        // Avoid common false positives: stop-word phrases like "The Daily Post"
        // are filtered below by the ORG_KEYWORDS check above.
        found.set(phrase, "Person");
      }
    }
  }

  // --- 3. Acronyms (all-caps 2–6 letters, not at sentence start) ---
  // These are usually organization names (FBI, CIA, NASA, SEC, FDA).
  const acrRe = /\b([A-Z]{2,6})\b/g;
  while ((m = acrRe.exec(cleaned)) !== null) {
    const acr = m[1];
    // Skip common English words that happen to be all-caps (I, A, ID, OK, TV)
    if (["I", "A", "ID", "OK", "TV", "PC", "AI", "US", "UK", "EU", "UN", "PR"].includes(acr)) {
      // US/UK/EU/UN are Place/Org — handle separately if mentioned in context
      continue;
    }
    found.set(acr, "Organization");
  }

  // --- 4. "The X" patterns → Organization ---
  const theXRe = /\bThe\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
  while ((m = theXRe.exec(cleaned)) !== null) {
    const phrase = `The ${m[1]}`;
    if (!found.has(phrase)) {
      // Only treat as org if it has an org keyword or is a known publication name
      const words = phrase.split(" ").slice(1); // skip "The"
      if (words.some((w) => ORG_KEYWORDS.has(w.replace(/\.$/, "")))) {
        found.set(phrase, "Organization");
      }
    }
  }

  // Filter out generic false positives (common nouns that title-case match)
  const BLACKLIST = new Set([
    "The Daily", "The United", "The Supreme", "The White", "The Wall",
    "The New", "The World", "The Federal", "The National", "The State",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
    "President", "Congress", "Senate", "House", "Parliament",
  ]);

  // Convert to array, dedup by name (prefer the more specific type).
  const entities: DetectedEntity[] = [];
  const seen = new Set<string>();
  for (const [name, type] of found) {
    if (BLACKLIST.has(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entities.push({ "@type": type, name });
    if (entities.length >= cap) break;
  }

  return entities;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripHonorific(phrase: string): string {
  return phrase.replace(/^(Mr|Mrs|Ms|Dr|Prof|Sen|Gov|President|Rep|Mayor|Judge|Ambassador|Secretary|General)\.\s+/, "");
}
