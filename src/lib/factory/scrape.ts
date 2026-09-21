import { Firecrawl } from "firecrawl";
import {
  classifyAsset,
  extractJsonLdProduct,
  filterPageAssets,
  guessBenefits,
  guessHowToUse,
  guessPromotion,
  hostOf,
  type JsonLdProduct,
} from "./assets";
import { extractPageAssets } from "./heuristic";
import type { PageAsset, ScrapeEngine, ScrapeReport } from "./types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type ScrapedPage = {
  text: string;
  html: string;
  assets: PageAsset[];
  jsonLd: JsonLdProduct | null;
  finalUrl: string;
  title?: string;
  howToUse?: string;
  promotion?: string;
  benefits: string[];
  report: ScrapeReport;
};

type FirecrawlDoc = {
  markdown?: string;
  html?: string;
  links?: string[];
  images?: unknown;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    url?: string;
    ogImage?: string;
    statusCode?: number;
  };
};

function emptyReport(url: string, notes: string[]): ScrapeReport {
  return {
    engine: "none",
    url,
    host: hostOf(url) ?? url,
    chars: 0,
    assets: 0,
    jsonLd: false,
    notes,
  };
}

function race<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function imagesFromMarkdown(md: string): string[] {
  const out: string[] = [];
  for (const match of md.matchAll(/!\[[^\]]*]\((https:[^)\s]+)\)/g)) {
    if (match[1]) out.push(match[1]);
  }
  return out;
}

function imagesFromUnknown(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string" && raw.startsWith("https://")) return [raw];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") return item.startsWith("https://") ? [item] : [];
      if (item && typeof item === "object" && "url" in item) {
        const url = (item as { url?: unknown }).url;
        return typeof url === "string" && url.startsWith("https://") ? [url] : [];
      }
      return [];
    });
  }
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).flatMap((item) =>
      typeof item === "string" && item.startsWith("https://") ? [item] : [],
    );
  }
  return [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 20000);
}

function mergeAssets(
  pageUrl: string,
  html: string,
  markdown: string,
  extra: string[],
): PageAsset[] {
  const fromHtml = html ? extractPageAssets(html.slice(0, 400_000), pageUrl) : [];
  const fromMd = imagesFromMarkdown(markdown).map((url) => ({
    url,
    kind: classifyAsset(url, "img"),
  }));
  const fromExtra = extra.map((url) => ({
    url,
    kind: classifyAsset(url, "og"),
  }));
  return filterPageAssets([...fromExtra, ...fromHtml, ...fromMd], pageUrl, 12);
}

async function scrapeFirecrawl(url: string): Promise<FirecrawlDoc | null> {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  const app = key ? new Firecrawl({ apiKey: key }) : new Firecrawl();
  const doc = (await race(
    app.scrape(url, { formats: ["markdown", "html", "links"] }),
    18000,
    "Firecrawl",
  )) as FirecrawlDoc;
  if (!doc) return null;
  if (!doc.markdown && !doc.html) return null;
  return doc;
}

async function scrapeDirect(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    8000,
  );
  if (!res?.ok) return null;
  const html = await res.text();
  if (!html || html.length < 80) return null;
  return { html, finalUrl: res.url || url };
}

async function scrapeJina(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://r.jina.ai/${url}`,
    { headers: { Accept: "text/plain", "User-Agent": "UGCFactory/1.0" } },
    8000,
  );
  if (!res?.ok) return null;
  const text = (await res.text()).trim();
  return text.length > 40 ? text.slice(0, 20000) : null;
}

export async function scrapeProductPage(url: URL): Promise<ScrapedPage> {
  const start = url.toString();
  const notes: string[] = [];
  let engine: ScrapeEngine = "none";
  let markdown = "";
  let html = "";
  let finalUrl = start;
  let title: string | undefined;
  const extraImages: string[] = [];

  try {
    const doc = await scrapeFirecrawl(start);
    if (doc) {
      engine = "firecrawl";
      markdown = (doc.markdown ?? "").slice(0, 20000);
      html = doc.html ?? "";
      finalUrl = doc.metadata?.url || doc.metadata?.sourceURL || start;
      title = doc.metadata?.title;
      extraImages.push(...imagesFromUnknown(doc.images));
      if (doc.metadata?.ogImage) extraImages.push(doc.metadata.ogImage);
      notes.push(
        `Firecrawl read ${markdown.length.toLocaleString()} characters of markdown` +
          (html ? ` and ${html.length.toLocaleString()} of HTML` : ""),
      );
      if (title) notes.push(`Title: ${title}`);
    }
  } catch {
    notes.push("Firecrawl missed this URL — trying a direct page read");
  }

  if (!markdown && !html) {
    const direct = await scrapeDirect(start);
    if (direct) {
      engine = "direct";
      html = direct.html;
      finalUrl = direct.finalUrl;
      notes.push(`Direct page read ${html.length.toLocaleString()} characters of HTML`);
    }
  }

  if (!markdown && !html) {
    const jina = await scrapeJina(start);
    if (jina) {
      engine = "jina";
      markdown = jina;
      notes.push(`Reader fallback returned ${jina.length.toLocaleString()} characters`);
    }
  }

  const jsonLd = html ? extractJsonLdProduct(html, finalUrl) : null;
  if (jsonLd?.name) notes.push(`JSON-LD product: ${jsonLd.name}`);
  if (jsonLd?.images?.length) extraImages.push(...jsonLd.images);

  const text = (
    markdown ||
    (html ? stripHtml(html) : "") ||
    [jsonLd?.name, jsonLd?.description, jsonLd?.brand].filter(Boolean).join(". ")
  ).slice(0, 20000);

  const assets = mergeAssets(finalUrl, html, markdown || text, extraImages);
  if (assets.length) notes.push(`${assets.length} page assets classified`);
  else notes.push("No pack stills found on this page");

  const howToUse = jsonLd?.howToUse || guessHowToUse(text);
  const promotion = guessPromotion(text);
  const benefits = guessBenefits(text);
  if (howToUse) notes.push("How to use extracted");
  if (promotion) notes.push(`Offer: ${promotion}`);

  if (engine === "none") {
    notes.push("Could not read the page. Paste a public product URL, or type demo.");
  }

  return {
    text,
    html,
    assets,
    jsonLd,
    finalUrl,
    title,
    howToUse,
    promotion,
    benefits,
    report: {
      engine,
      url: finalUrl,
      host: hostOf(finalUrl) ?? hostOf(start) ?? start,
      title,
      chars: text.length,
      assets: assets.length,
      jsonLd: Boolean(jsonLd?.name),
      notes: notes.slice(0, 8),
    },
  };
}

export function failedScrape(url: string, notes: string[]): ScrapedPage {
  return {
    text: "",
    html: "",
    assets: [],
    jsonLd: null,
    finalUrl: url,
    howToUse: undefined,
    promotion: undefined,
    benefits: [],
    report: emptyReport(url, notes),
  };
}
