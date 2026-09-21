import type { ProductBrief } from "./types";
import { filterPageAssets, filterPageImages } from "./assets";

/** Latin letters plus common punctuation — used to drop Tamil, Hindi, CJK, etc. */
const KEEP =
  /[^\x20-\x7E\u00A0-\u024F\u2010-\u2027\u2030-\u203A€£]/g;

export function englishOnly(value: string): string {
  return value.replace(KEEP, " ").replace(/\s+/g, " ").trim();
}

export function isEnglishish(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return false;
  const latin = compact.replace(/[^\x00-\x7F\u00A0-\u024F]/g, "").length;
  return latin / compact.length >= 0.72;
}

const INR_USD = 83;

export function globalizePrice(raw: string): string {
  const text = englishOnly(raw).trim();
  if (!text) return "see product page";

  const rupee =
    raw.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    raw.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|rupees?)/i);
  if (rupee) {
    const n = Number(rupee[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) {
      const usd = Math.max(1, Math.round(n / INR_USD));
      return `$${usd}`;
    }
  }

  const named = text.match(
    /^(?:USD|EUR|GBP|CAD|AUD)\s*([\d,]+(?:[.,]\d{2})?)$/i,
  );
  if (named) {
    const amount = named[1] ?? "";
    const code = text.slice(0, 3).toUpperCase();
    if (code === "USD") return `$${amount}`;
    if (code === "EUR") return `€${amount}`;
    if (code === "GBP") return `£${amount}`;
    return `${code} ${amount}`;
  }

  if (/^[\$€£]/.test(text) || /\b(?:USD|EUR|GBP|CAD|AUD)\b/i.test(text)) {
    return text.replace(/\bUSD\b/i, "$").replace(/\s+/g, " ").trim();
  }

  const bare = text.match(/^(\d{1,5}(?:[.,]\d{2})?)$/);
  if (bare) return `$${bare[1]}`;

  return text.slice(0, 24) || "see product page";
}

function cleanLine(value: string): string {
  return englishOnly(value);
}

function cleanList(values: string[]): string[] {
  return values.map(cleanLine).filter((item) => item.length > 1).slice(0, 6);
}

function httpsOnly(urls: string[] | undefined, pageUrl?: string): string[] {
  return filterPageImages(urls, pageUrl, 12);
}

export function sanitizeBrief(brief: ProductBrief): ProductBrief {
  return {
    ...brief,
    name: cleanLine(brief.name) || "Untitled product",
    brand: cleanLine(brief.brand) || "Brand",
    category: cleanLine(brief.category) || "consumer product",
    price: globalizePrice(brief.price),
    oneLiner: cleanLine(brief.oneLiner),
    problem: cleanLine(brief.problem),
    outcome: cleanLine(brief.outcome),
    mechanism: cleanLine(brief.mechanism),
    claims: cleanList(brief.claims),
    proof: cleanList(brief.proof),
    objections: cleanList(brief.objections),
    audience: cleanLine(brief.audience),
    ingredients: cleanList(brief.ingredients),
    differentiator: cleanLine(brief.differentiator),
    cta: cleanLine(brief.cta) || `Get ${cleanLine(brief.name) || "it"}`,
    setting: cleanLine(brief.setting) || "a real home, window light, no set design",
    wardrobe: cleanLine(brief.wardrobe) || "everyday clothes, no costume",
    unit: brief.unit ? cleanLine(brief.unit).slice(0, 40) : undefined,
    size: brief.size ? cleanLine(brief.size).slice(0, 40) : undefined,
    boxContents: brief.boxContents ? cleanLine(brief.boxContents).slice(0, 180) : undefined,
    skus: brief.skus ? cleanList(brief.skus) : undefined,
    pageImages: httpsOnly(brief.pageImages, brief.url),
    pageAssets: filterPageAssets(brief.pageAssets, brief.url, 12),
    competitor: brief.competitor ? cleanLine(brief.competitor).slice(0, 80) : undefined,
    competitorUrl: brief.competitorUrl?.startsWith("http") ? brief.competitorUrl : undefined,
    rivals: (brief.rivals ?? [])
      .map((item) => ({
        name: cleanLine(item.name).slice(0, 80),
        url: item.url?.startsWith("http") ? item.url : undefined,
        reason: cleanLine(item.reason).slice(0, 140),
        price: item.price ? cleanLine(item.price).slice(0, 24) : undefined,
      }))
      .filter((item) => item.name.length > 1)
      .slice(0, 4),
    voiceSamples: brief.voiceSamples ? cleanList(brief.voiceSamples).slice(0, 3) : undefined,
    claimSources: (brief.claimSources ?? [])
      .map((item) => ({
        claim: cleanLine(item.claim).slice(0, 180),
        source: cleanLine(item.source).slice(0, 240),
        url: item.url?.startsWith("http") ? item.url : brief.url,
      }))
      .filter((item) => item.claim.length > 1)
      .slice(0, 8),
    stars: brief.stars ? cleanLine(brief.stars).slice(0, 40) : undefined,
    reviewQuotes: brief.reviewQuotes ? cleanList(brief.reviewQuotes).slice(0, 4) : undefined,
    tastesLike: brief.tastesLike ? cleanLine(brief.tastesLike).slice(0, 80) : undefined,
    howToUse: brief.howToUse ? cleanLine(brief.howToUse).slice(0, 220) : undefined,
    promotion: brief.promotion ? cleanLine(brief.promotion).slice(0, 160) : undefined,
    benefits: brief.benefits ? cleanList(brief.benefits).slice(0, 4) : undefined,
    scrape: brief.scrape,
  };
}

export const GLOBAL_ENGLISH_RULES = [
  "Write only in English. Never use Tamil, Hindi, or any other language.",
  "Audience is worldwide English speakers — London, Lagos, Singapore, Toronto, Austin.",
  "No slang that only works in one country. No local memes. No festival-only copy unless the product is that festival.",
  "Prices use $, €, or £. If the source is INR/₹/rupees, convert about ₹83 to $1 and write $N. Never write ₹ or INR.",
  "American spelling is fine (the ad-platform standard). Keep sentences short and shootable.",
].join(" ");
