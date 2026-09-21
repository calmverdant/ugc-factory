import type { PageAsset, ProductBrief } from "./types";
import {
  classifyAsset,
  extractJsonLdProduct,
  filterPageAssets,
  guessBenefits,
  guessHowToUse,
  guessPromotion,
  isProductStill,
} from "./assets";
import { globalizePrice, isEnglishish, sanitizeBrief } from "./english";
import { attachReviews } from "./reviews";

function firstHeading(text: string): string | null {
  const atx = text.match(/^#{1,3}\s+(.+)$/m);
  if (atx?.[1]) return clean(atx[1]);
  const title = text.match(/^(?:Title|title):\s*(.+)$/m);
  if (title?.[1]) return clean(title[1]);
  return null;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[#*_`|]/g, "").trim();
}

function unique(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = clean(value);
    if (item.length < 8 || item.length > 140) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function guessCategory(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  const pairs: [RegExp, string][] = [
    [/serum|retin|niacinamide|vitamin c|moisturizer|sunscreen/, "skincare"],
    [/magnesium|sleep|melatonin|supplement|gummy|drink stick/, "wellness drink"],
    [/kettle|pour-?over|coffee|grinder/, "coffee gear"],
    [/shoe|sneaker|boot/, "footwear"],
    [/serum|oil|hair/, "hair care"],
    [/candle|diffuser/, "home fragrance"],
    [/protein|creatine/, "sports nutrition"],
  ];
  for (const [pattern, label] of pairs) {
    if (pattern.test(lower)) return label;
  }
  return fallback;
}

function guessPrice(text: string): string {
  const match =
    text.match(/(?:USD|EUR|GBP|CAD|AUD|INR|Rs\.?|\$|₹|€|£)\s?\d{1,6}(?:[.,]\d{2})?/) ??
    text.match(/\b\d{1,6}(?:[.,]\d{2})?\s?(?:USD|EUR|GBP|INR|Rs\.?)\b/i);
  if (!match) return "see product page";
  return globalizePrice(match[0]);
}

function guessUnit(text: string): string | undefined {
  const match = text.match(
    /\b(\d+(?:\.\d+)?\s?(?:ml|fl\.?\s?oz|oz|g|mg|sticks?|capsules?|servings?|count))\b/i,
  );
  return match?.[1]?.slice(0, 40);
}

function guessSize(text: string): string | undefined {
  const match = text.match(
    /\b((?:7|14|30|60|90)[-\s]?(?:day|night)s?|(?:travel|full)[-\s]?size|\d+\s?(?:ml|oz) bottle)\b/i,
  );
  return match?.[1]?.slice(0, 40);
}

function guessBox(text: string): string | undefined {
  const match = text.match(
    /(?:what(?:'s| is) in the box|includes|contains|box contents)[:\s]+([^.!?\n]{8,120})/i,
  );
  return match?.[1] ? clean(match[1]).slice(0, 180) : undefined;
}

function guessSkus(text: string): string[] {
  const hits = [...text.matchAll(/\b(?:SKU|Item(?:\s+no\.?)?)[:\s#]*([A-Z0-9-]{3,16})\b/gi)]
    .map((m) => m[1] ?? "")
    .filter(Boolean);
  const named = [...text.matchAll(/\b((?:travel|30[-\s]?night|7[-\s]?day|50ml|30ml|100ml)[^\n,]{0,24})\b/gi)]
    .map((m) => clean(m[1] ?? ""))
    .filter((item) => item.length > 2);
  return unique([...hits, ...named], 3);
}

function largestFromSrcset(raw: string): string {
  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return (parts[parts.length - 1] ?? "").split(/\s+/)[0] ?? "";
}

export function extractPageAssets(html: string, pageUrl: string): PageAsset[] {
  const ranked: { url: string; kind: PageAsset["kind"]; order: number }[] = [];

  const push = (raw: string | undefined, kind: PageAsset["kind"], order: number) => {
    if (!raw) return;
    const token = raw.trim().startsWith("http") ? raw.trim() : largestFromSrcset(raw);
    const href = token.split(/\s+/)[0]?.split(",")[0]?.trim();
    if (!href || href.startsWith("data:")) return;
    try {
      const url = new URL(href.replace(/^\/\//, "https://"), pageUrl).toString();
      if (!isProductStill(url, pageUrl)) return;
      ranked.push({ url, kind, order });
    } catch {
      // ignore
    }
  };

  const json = extractJsonLdProduct(html, pageUrl);
  for (const url of json?.images ?? []) push(url, "hero", 0);

  for (const match of html.matchAll(
    /property=["']og:image(?::(?:url|secure_url))?["'][^>]*content=["']([^"']+)["']/gi,
  )) {
    push(match[1], "hero", 1);
  }
  for (const match of html.matchAll(
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::(?:url|secure_url))?["']/gi,
  )) {
    push(match[1], "hero", 1);
  }
  for (const match of html.matchAll(
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi,
  )) {
    push(match[1], "hero", 1);
  }
  for (const match of html.matchAll(
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/gi,
  )) {
    push(match[1], "hero", 1);
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0] ?? "";
    if (/width=["'](?:[0-9]|[1-7][0-9])["']/i.test(tag)) continue;
    const src =
      tag.match(/\b(?:data-src|data-lazy-src|data-original)=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    if (/\.(svg|gif|ico)(\?|$)/i.test(src) && !/srcset/i.test(tag)) continue;
    push(src, classifyAsset(src, "img"), 2);
  }

  ranked.sort((a, b) => a.order - b.order);
  return filterPageAssets(
    ranked.map((item) => ({ url: item.url, kind: item.kind })),
    pageUrl,
    12,
  );
}

export function extractPageImages(html: string, base: string): string[] {
  return extractPageAssets(html, base).map((item) => item.url);
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "your",
  "our",
  "shop",
  "buy",
  "new",
]);

export function heuristicBrief(input: {
  query: string;
  pageText?: string;
  url?: string;
  pageImages?: string[];
  pageAssets?: PageAsset[];
  howToUse?: string;
  promotion?: string;
  benefits?: string[];
}): ProductBrief {
  const text = (input.pageText ?? input.query).slice(0, 20000);
  const heading = firstHeading(text);
  const fromQuery = clean(
    input.query.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "Untitled product",
  )
    .replace(/^www\./, "")
    .slice(0, 80);
  const name = (heading ?? fromQuery) || "Untitled product";

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter(
      (s) =>
        s.length > 30 &&
        s.length < 180 &&
        isEnglishish(s) &&
        !/cookie|privacy|subscribe/i.test(s),
    );

  const bullets = unique(
    [...text.matchAll(/^(?:[-*•]|\d+\.)\s+(.+)$/gm)]
      .map((m) => m[1] ?? "")
      .filter(isEnglishish),
    6,
  );

  const brandToken = name.split(/\s+/)[0] ?? name;
  const category = guessCategory(text, "consumer product");
  const price = guessPrice(text);
  const oneLiner = sentences[0] ?? `${name} — a ${category} worth a native ad.`;
  const claims = bullets.length ? bullets.slice(0, 3) : sentences.slice(1, 4);
  const ingredients = unique(
    [...text.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/g)]
      .map((m) => m[1] ?? "")
      .filter((word) => word.split(" ").every((w) => !STOP.has(w.toLowerCase()))),
    4,
  );
  const vs = text.match(/\bvs\.?\s+([A-Z][A-Za-z0-9 &-]{2,40})/);
  const assets = input.pageAssets?.length
    ? input.pageAssets
    : (input.pageImages ?? []).map((url) => ({ url, kind: "other" as const }));
  const images = assets.map((item) => item.url);
  const benefits = input.benefits?.length ? input.benefits : guessBenefits(text);
  const howToUse = input.howToUse || guessHowToUse(text);
  const promotion = input.promotion || guessPromotion(text);
  const problemHit = grabProblem(text, category);

  return sanitizeBrief(
    attachReviews(
      {
        name: name.slice(0, 80),
        brand: brandToken.slice(0, 40),
        category,
        price,
        oneLiner: oneLiner.slice(0, 220),
        problem: problemHit,
        outcome: `a ${category} that actually earns a slot`,
        mechanism: claims[0] ?? oneLiner,
        claims: (claims.length ? claims : [oneLiner]).slice(0, 4),
        proof: bullets.slice(3, 6).length
          ? bullets.slice(3, 6)
          : ["check the product page for reviews and testing notes"],
        objections: [`another ${category} that looks the same on camera`],
        audience: `people already shopping ${category}`,
        ingredients: ingredients.length ? ingredients : [category],
        differentiator: claims[1] ?? oneLiner,
        cta: `Get ${name}`,
        setting: "a real home, window light, no set design",
        wardrobe: "everyday clothes, no costume",
        url: input.url,
        source: input.url ? "url" : "typed",
        unit: guessUnit(text),
        size: guessSize(text),
        boxContents: guessBox(text),
        skus: guessSkus(text),
        pageImages: images,
        pageAssets: assets,
        competitor: vs?.[1] ? clean(vs[1]) : undefined,
        howToUse,
        promotion,
        benefits,
      },
      text,
    ),
  );
}

function grabProblem(text: string, category: string): string {
  const hit = text.match(
    /(?:tired of|sick of|struggling with|problem is|if you(?:'re| are) dealing with)\s+([^.!?\n]{12,140})/i,
  );
  if (hit?.[1]) return clean(hit[1]).slice(0, 180);
  return `the usual ${category} still not doing the job`;
}

export function isSafePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return null;
  }
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    return null;
  }
  return url;
}
