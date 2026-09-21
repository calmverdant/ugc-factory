import type { MintedAd, PageAsset, PageAssetKind, ProductBrief } from "./types";

const DESIGN_ROOTS = [
  "kittl.com",
  "canva.com",
  "figma.com",
  "photopea.com",
  "looka.com",
  "midjourney.com",
  "creativefabrica.com",
];

const CDN_HINT =
  /shopify|cloudinary|imgix|googleusercontent|fbcdn|twimg|squarespace|wixstatic|bigcommerce|woocommerce|akamai|cloudfront|fastly|scene7|demandware|magento|sfcc|imgix\.net|images\.unsplash|cdn\.shop|cdn-apple|appleusercontent|akamaihd|scene7/i;

const CHROME_PATH =
  /\/(?:editor|template|templates|canvas|ui-kit|mockup|logo-maker|design-tool)\//i;

export function hostOf(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(href).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function registrable(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const last = parts[parts.length - 1] ?? "";
  const second = parts[parts.length - 2] ?? "";
  if (["co", "com", "net", "org", "gov"].includes(second) && last.length <= 3) {
    return parts.slice(-3).join(".");
  }
  return `${second}.${last}`;
}

export function isDesignChrome(imageUrl: string, pageUrl?: string): boolean {
  const img = hostOf(imageUrl);
  if (!img) return true;
  const page = hostOf(pageUrl);
  const pageRoot = page ? registrable(page) : "";
  if (DESIGN_ROOTS.some((root) => img === root || img.endsWith(`.${root}`))) {
    return pageRoot !== registrable(img);
  }
  if (CHROME_PATH.test(imageUrl)) return true;
  return false;
}

export function sameProductHost(imageUrl: string, pageUrl?: string): boolean {
  const img = hostOf(imageUrl);
  if (!img) return false;
  const page = hostOf(pageUrl);
  if (!page) return !isDesignChrome(imageUrl, pageUrl);
  if (registrable(img) === registrable(page)) return true;
  if (CDN_HINT.test(imageUrl) || CDN_HINT.test(img)) return true;
  return false;
}

export function isProductStill(url: string, pageUrl?: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  if (url.length > 1800) return false;
  if (/\.(svg|gif|ico|woff2?)(\?|$)/i.test(url)) return false;
  if (
    /pixel|sprite|\bicon\b|favicon|logo|1x1|tracking|badge|spacer|placeholder|lqip|blur|emoji|avatar/i.test(
      url,
    )
  ) {
    return false;
  }
  if (isDesignChrome(url, pageUrl)) return false;
  if (pageUrl && !sameProductHost(url, pageUrl)) return false;
  return true;
}

export function classifyAsset(url: string, role: "og" | "jsonld" | "img"): PageAssetKind {
  if (role === "og" || role === "jsonld") return "hero";
  if (/pack|pdp|product|bottle|pouch|box|sku|hero|gallery/i.test(url)) return "pack";
  if (/lifestyle|campaign|model|ugc|review|before|after|in-use/i.test(url)) {
    return "lifestyle";
  }
  return "other";
}

export function filterPageImages(
  urls: string[] | undefined,
  pageUrl?: string,
  max = 12,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls ?? []) {
    const url = raw.trim();
    if (!isProductStill(url, pageUrl)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

export function filterPageAssets(
  assets: PageAsset[] | undefined,
  pageUrl?: string,
  max = 12,
): PageAsset[] {
  const seen = new Set<string>();
  const out: PageAsset[] = [];
  for (const asset of assets ?? []) {
    if (!isProductStill(asset.url, pageUrl)) continue;
    if (seen.has(asset.url)) continue;
    seen.add(asset.url);
    out.push(asset);
    if (out.length >= max) break;
  }
  return out;
}

export function stillForVideo(
  ad: Pick<MintedAd, "stillUrl" | "cutawayUrl">,
  brief: Pick<ProductBrief, "url" | "pageImages" | "pageAssets">,
): string | undefined {
  const ranked = [
    ad.stillUrl,
    ad.cutawayUrl,
    ...(brief.pageAssets ?? [])
      .filter((item) => item.kind === "hero" || item.kind === "pack")
      .map((item) => item.url),
    ...(brief.pageImages ?? []),
  ].filter((item): item is string => typeof item === "string" && item.length > 0);
  return ranked.find((url) => isProductStill(url, brief.url));
}

export function productCutaway(
  ad: Pick<MintedAd, "stillUrl" | "cutawayUrl">,
  brief: Pick<ProductBrief, "url" | "pageImages" | "pageAssets">,
): string | undefined {
  return stillForVideo(ad, brief);
}

export type JsonLdProduct = {
  name?: string;
  brand?: string;
  description?: string;
  price?: string;
  images: string[];
  sku?: string;
  rating?: string;
  category?: string;
  howToUse?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function walkJsonLd(node: unknown, out: Record<string, unknown>[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, out);
    return;
  }
  const rec = asRecord(node);
  if (!rec) return;
  if (rec["@graph"]) walkJsonLd(rec["@graph"], out);
  out.push(rec);
}

function jsonType(node: Record<string, unknown>): string {
  const raw = node["@type"];
  if (typeof raw === "string") return raw.toLowerCase();
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
  }
  return "";
}

function jsonImages(value: unknown, pageUrl: string): string[] {
  const out: string[] = [];
  const push = (item: unknown) => {
    if (typeof item === "string") {
      try {
        const url = new URL(item.replace(/^\/\//, "https://"), pageUrl);
        if (url.protocol === "https:") out.push(url.toString());
      } catch {
        // ignore
      }
      return;
    }
    const rec = asRecord(item);
    if (rec && typeof rec.url === "string") push(rec.url);
    if (rec && typeof rec.contentUrl === "string") push(rec.contentUrl);
  };
  if (Array.isArray(value)) {
    for (const item of value) push(item);
  } else {
    push(value);
  }
  return out;
}

function jsonText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  const rec = asRecord(value);
  if (rec && typeof rec.name === "string") return rec.name.trim();
  return undefined;
}

export function extractJsonLdProduct(html: string, pageUrl: string): JsonLdProduct | null {
  const nodes: Record<string, unknown>[] = [];
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;
    try {
      walkJsonLd(JSON.parse(raw), nodes);
    } catch {
      // ignore broken JSON-LD
    }
  }
  const product =
    nodes.find((node) => /product/.test(jsonType(node))) ??
    nodes.find((node) => jsonType(node).includes("offer")) ??
    null;
  if (!product) return null;

  const offers = asRecord(product.offers) ?? asRecord(
    Array.isArray(product.offers) ? product.offers[0] : null,
  );
  const brand = jsonText(product.brand) ?? jsonText(product.manufacturer);
  const aggregate = asRecord(product.aggregateRating);
  const rating =
    aggregate && (aggregate.ratingValue || aggregate.reviewCount)
      ? `${aggregate.ratingValue ?? ""} stars${
          aggregate.reviewCount ? ` from ${aggregate.reviewCount} reviews` : ""
        }`.trim()
      : undefined;
  const instructions =
    jsonText(product.usageInfo) ??
    jsonText(product.instructions) ??
    jsonText(asRecord(product.hasInstruction)?.text);

  return {
    name: jsonText(product.name)?.slice(0, 80),
    brand: brand?.slice(0, 40),
    description: jsonText(product.description)?.slice(0, 400),
    price:
      jsonText(offers?.price)
        ? `${jsonText(offers?.priceCurrency) === "EUR" ? "€" : jsonText(offers?.priceCurrency) === "GBP" ? "£" : "$"}${jsonText(offers?.price)}`
        : undefined,
    images: jsonImages(product.image ?? product.images, pageUrl).slice(0, 8),
    sku: jsonText(product.sku)?.slice(0, 40),
    rating: rating?.slice(0, 80),
    category: jsonText(product.category)?.slice(0, 60),
    howToUse: instructions?.slice(0, 220),
  };
}

function grabSection(text: string, labels: RegExp, max = 220): string | undefined {
  const match = text.match(labels);
  if (!match) return undefined;
  const tail = (match[1] ?? match[0] ?? "").replace(/\s+/g, " ").trim();
  if (tail.length < 12) return undefined;
  return tail.slice(0, max);
}

export function guessHowToUse(text: string): string | undefined {
  return grabSection(
    text,
    /(?:how to use|directions|usage|apply|take one|mix with)[:\s]+([^.!?\n]{12,220})/i,
  );
}

export function guessPromotion(text: string): string | undefined {
  return grabSection(
    text,
    /((?:\d{1,2}%\s+off|subscribe and save|buy \d+ get \d+|bundle and save|free shipping)[^.!?\n]{0,120})/i,
    160,
  );
}

export function guessBenefits(text: string): string[] {
  const block = text.match(
    /(?:benefits|why it works|why you'll love|what it does)[:\s]+([\s\S]{20,600})/i,
  );
  const source = block?.[1] ?? text;
  const hits = [...source.matchAll(/^(?:[-*•]|\d+\.)\s+(.{12,140})$/gm)]
    .map((item) => (item[1] ?? "").replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 12);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of hits) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 4) break;
  }
  return unique;
}

export function assetKindLabel(kind: PageAssetKind): string {
  if (kind === "hero") return "Hero";
  if (kind === "pack") return "Pack";
  if (kind === "lifestyle") return "Lifestyle";
  return "Page";
}
