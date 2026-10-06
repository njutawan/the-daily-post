import { createHmac, timingSafeEqual } from "node:crypto";

export type StripePlanId = "digital" | "digital-annual" | "allaccess";

export type StripePlan = {
  id: StripePlanId;
  tier: "digital" | "allaccess";
  billingCycle: "monthly" | "annual";
  priceId: string;
  amount: number;
  currency: "usd";
  label: string;
};

const PLAN_DEFINITIONS: Record<
  StripePlanId,
  Omit<StripePlan, "priceId"> & { priceEnv: string }
> = {
  digital: {
    id: "digital",
    tier: "digital",
    billingCycle: "monthly",
    amount: 499,
    currency: "usd",
    label: "The Daily Post Digital — Monthly",
    priceEnv: "STRIPE_PRICE_DIGITAL_MONTHLY",
  },
  "digital-annual": {
    id: "digital-annual",
    tier: "digital",
    billingCycle: "annual",
    amount: 4999,
    currency: "usd",
    label: "The Daily Post Digital — Annual",
    priceEnv: "STRIPE_PRICE_DIGITAL_ANNUAL",
  },
  allaccess: {
    id: "allaccess",
    tier: "allaccess",
    billingCycle: "monthly",
    amount: 999,
    currency: "usd",
    label: "The Daily Post All Access — Monthly",
    priceEnv: "STRIPE_PRICE_ALLACCESS_MONTHLY",
  },
};

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export class StripeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StripeApiError";
    this.status = status;
  }
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new StripeConfigurationError("Stripe is not configured: STRIPE_SECRET_KEY is missing.");
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new StripeConfigurationError("Stripe webhooks are not configured: STRIPE_WEBHOOK_SECRET is missing.");
  }
  return secret;
}

export function getStripePlan(planId: string): StripePlan | null {
  if (!Object.prototype.hasOwnProperty.call(PLAN_DEFINITIONS, planId)) return null;
  const definition = PLAN_DEFINITIONS[planId as StripePlanId];
  const priceId = process.env[definition.priceEnv]?.trim();
  if (!priceId) {
    throw new StripeConfigurationError(
      `Stripe is not configured: ${definition.priceEnv} is missing.`,
    );
  }
  return { ...definition, priceId };
}

export function getPlanForStripePrice(priceId: string): StripePlan | null {
  for (const definition of Object.values(PLAN_DEFINITIONS)) {
    const configuredPriceId = process.env[definition.priceEnv]?.trim();
    if (configuredPriceId === priceId) {
      return { ...definition, priceId: configuredPriceId };
    }
  }
  return null;
}

/** Resolve a safe absolute return URL for Stripe Checkout / Billing Portal. */
export function getStripeSiteUrl(requestOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const raw = configured || (process.env.NODE_ENV === "production" ? "" : requestOrigin || "");
  if (!raw) {
    throw new StripeConfigurationError("Set NEXT_PUBLIC_SITE_URL before creating a Stripe session.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new StripeConfigurationError("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  }

  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
    throw new StripeConfigurationError("Stripe return URLs must use HTTPS in production.");
  }
  if (process.env.NODE_ENV === "production" && url.hostname.endsWith(".example")) {
    throw new StripeConfigurationError("Replace the example NEXT_PUBLIC_SITE_URL with the production domain.");
  }

  return url.origin;
}

type StripeRequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  form?: URLSearchParams;
  idempotencyKey?: string;
};

/** Minimal Stripe REST client; secrets remain server-side and no card data enters this app. */
export async function stripeRequest<T extends Record<string, unknown>>(
  path: string,
  options: StripeRequestOptions = {},
): Promise<T> {
  const secretKey = getStripeSecretKey();
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };
  if (options.form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\//, "")}`, {
    method,
    headers,
    body: options.form?.toString(),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null &&
      "error" in payload && typeof payload.error === "object" && payload.error !== null &&
      "message" in payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : `Stripe API request failed (${response.status}).`;
    throw new StripeApiError(message, response.status);
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new StripeApiError("Stripe returned an invalid response.", response.status);
  }
  return payload as T;
}

/** Verify Stripe's timestamped HMAC-SHA256 signature against the raw request body. */
export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === "v1" && /^[a-f0-9]{64}$/i.test(value)) signatures.push(value);
  }

  if (timestamp === null || signatures.length === 0) return false;
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest();

  return signatures.some((signature) => {
    const provided = Buffer.from(signature, "hex");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}

export function createStripeTestSignature(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}
