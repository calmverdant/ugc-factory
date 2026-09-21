import { englishOnly, isEnglishish } from "./english";
import type { ClaimSource, ProductBrief } from "./types";

function clean(value: string): string {
  return englishOnly(value).replace(/\s+/g, " ").trim();
}

function unique(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = clean(value);
    if (item.length < 8 || item.length > 160) continue;
    if (!isEnglishish(item)) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function mineReviews(text: string): {
  stars?: string;
  tastesLike?: string;
  quotes: string[];
  objections: string[];
} {
  const starsMatch =
    text.match(/(\d(?:\.\d)?)\s*(?:\/\s*5)?\s*stars?/i) ??
    text.match(/rated\s+(\d(?:\.\d)?)\s*(?:out of 5)?/i);
  const tastes =
    text.match(/tastes?\s+like\s+([^.!?\n]{3,48})/i)?.[1] ??
    text.match(/flavor(?:s)?\s+(?:of|like)\s+([^.!?\n]{3,48})/i)?.[1];
  const quotes = unique(
    [...text.matchAll(/[“"]([^”"]{18,140})[”"]/g)].map((m) => m[1] ?? ""),
    4,
  );
  const objections = unique(
    [
      ...text.matchAll(
        /(?:too|didn't|did not|wish it|not enough|aftertaste|groggy|chalky|sticky|expensive)[^.!?\n]{8,80}/gi,
      ),
    ].map((m) => m[0] ?? ""),
    4,
  );
  return {
    stars: starsMatch ? clean(starsMatch[0]).slice(0, 40) : undefined,
    tastesLike: tastes ? clean(tastes).slice(0, 80) : undefined,
    quotes,
    objections,
  };
}

export function claimSourcesFrom(
  text: string,
  claims: string[],
  url?: string,
): ClaimSource[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter((s) => s.length > 20 && s.length < 220 && isEnglishish(s));
  const out: ClaimSource[] = [];
  for (const claim of claims.slice(0, 6)) {
    const nums = claim.match(/\d+(?:[.,]\d+)?/g) ?? [];
    const hit =
      sentences.find((s) =>
        nums.length
          ? nums.some((n) => s.includes(n))
          : s.toLowerCase().includes(claim.slice(0, 18).toLowerCase()),
      ) ?? claim;
    out.push({ claim, source: hit, url });
  }
  return out;
}

export function attachReviews(
  brief: ProductBrief,
  pageText: string,
): ProductBrief {
  const mined = mineReviews(pageText);
  const objections = brief.objections.length
    ? brief.objections
    : mined.objections.slice(0, 4);
  const proof = [...brief.proof];
  if (mined.stars && !proof.some((item) => item.includes(mined.stars!))) {
    proof.unshift(mined.stars);
  }
  if (mined.tastesLike && !proof.some((item) => /taste/i.test(item))) {
    proof.push(`tastes like ${mined.tastesLike}`);
  }
  return {
    ...brief,
    proof: proof.slice(0, 6),
    objections,
    stars: brief.stars || mined.stars,
    tastesLike: brief.tastesLike || mined.tastesLike,
    reviewQuotes: brief.reviewQuotes?.length ? brief.reviewQuotes : mined.quotes,
    claimSources:
      brief.claimSources?.length
        ? brief.claimSources
        : claimSourcesFrom(pageText, brief.claims, brief.url),
  };
}

export function sourceForClaim(brief: ProductBrief, needle: string): ClaimSource | null {
  const exact = brief.claimSources?.find(
    (item) => item.claim === needle || item.claim.includes(needle) || needle.includes(item.claim),
  );
  if (exact) return exact;
  const nums = needle.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return (
    brief.claimSources?.find((item) => nums.some((n) => item.source.includes(n))) ??
    null
  );
}
