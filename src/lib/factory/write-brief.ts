import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  extractJsonLdProduct,
  guessBenefits,
  guessHowToUse,
  guessPromotion,
  type JsonLdProduct,
} from "./assets";
import { GLOBAL_ENGLISH_RULES, sanitizeBrief } from "./english";
import { extractPageAssets, heuristicBrief, isSafePublicUrl } from "./heuristic";
import { attachReviews } from "./reviews";
import { attachRivals, scoutRivals } from "./rivals";
import type { ClaimSource, PageAsset, ProductBrief, WriteBriefResult } from "./types";

const Input = z.object({
  query: z.string().trim().min(1).max(2000),
});

const BRIEF_JSON_SHAPE = `{
  "name": string,
  "brand": string,
  "category": string,
  "price": string,
  "oneLiner": string,
  "problem": string,
  "outcome": string,
  "mechanism": string,
  "howToUse": string,
  "promotion": string,
  "benefits": string[],
  "claims": string[],
  "proof": string[],
  "objections": string[],
  "audience": string,
  "ingredients": string[],
  "differentiator": string,
  "cta": string,
  "setting": string,
  "wardrobe": string,
  "unit": string,
  "size": string,
  "boxContents": string,
  "skus": string[],
  "competitor": string,
  "stars": string,
  "tastesLike": string,
  "reviewQuotes": string[],
  "claimSources": [{"claim": string, "source": string}]
}`;

function stripFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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

function coerceBrief(raw: unknown, fallback: ProductBrief): ProductBrief {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const str = (key: keyof ProductBrief, backup: string) =>
    typeof o[key] === "string" && o[key].trim()
      ? (o[key] as string).trim()
      : backup;
  const arr = (key: keyof ProductBrief, backup: string[]) =>
    Array.isArray(o[key])
      ? (o[key] as unknown[])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 6)
      : backup;
  const opt = (key: keyof ProductBrief) =>
    typeof o[key] === "string" && (o[key] as string).trim()
      ? (o[key] as string).trim()
      : fallback[key];
  return {
    name: str("name", fallback.name).slice(0, 80),
    brand: str("brand", fallback.brand).slice(0, 40),
    category: str("category", fallback.category).slice(0, 60),
    price: str("price", fallback.price).slice(0, 24),
    oneLiner: str("oneLiner", fallback.oneLiner).slice(0, 240),
    problem: str("problem", fallback.problem).slice(0, 180),
    outcome: str("outcome", fallback.outcome).slice(0, 180),
    mechanism: str("mechanism", fallback.mechanism).slice(0, 220),
    claims: arr("claims", fallback.claims),
    proof: arr("proof", fallback.proof),
    objections: arr("objections", fallback.objections),
    audience: str("audience", fallback.audience).slice(0, 180),
    ingredients: arr("ingredients", fallback.ingredients),
    differentiator: str("differentiator", fallback.differentiator).slice(0, 220),
    cta: str("cta", fallback.cta).slice(0, 80),
    setting: str("setting", fallback.setting).slice(0, 180),
    wardrobe: str("wardrobe", fallback.wardrobe).slice(0, 180),
    url: fallback.url,
    source: fallback.source,
    unit: typeof opt("unit") === "string" ? (opt("unit") as string).slice(0, 40) : fallback.unit,
    size: typeof opt("size") === "string" ? (opt("size") as string).slice(0, 40) : fallback.size,
    boxContents:
      typeof opt("boxContents") === "string"
        ? (opt("boxContents") as string).slice(0, 180)
        : fallback.boxContents,
    skus: arr("skus", fallback.skus ?? []),
    pageImages: fallback.pageImages,
    pageAssets: fallback.pageAssets,
    competitor:
      typeof opt("competitor") === "string"
        ? (opt("competitor") as string).slice(0, 80)
        : fallback.competitor,
    competitorUrl: fallback.competitorUrl,
    voiceSamples: fallback.voiceSamples,
    stars: typeof o.stars === "string" ? (o.stars as string).slice(0, 40) : fallback.stars,
    tastesLike:
      typeof o.tastesLike === "string" ? (o.tastesLike as string).slice(0, 80) : fallback.tastesLike,
    reviewQuotes: arr("reviewQuotes" as keyof ProductBrief, fallback.reviewQuotes ?? []),
    claimSources: coerceSources(o.claimSources, fallback),
    howToUse:
      typeof o.howToUse === "string" ? (o.howToUse as string).slice(0, 220) : fallback.howToUse,
    promotion:
      typeof o.promotion === "string" ? (o.promotion as string).slice(0, 160) : fallback.promotion,
    benefits: arr("benefits" as keyof ProductBrief, fallback.benefits ?? []),
  };
}

function coerceSources(raw: unknown, fallback: ProductBrief): ClaimSource[] | undefined {
  if (!Array.isArray(raw)) return fallback.claimSources;
  const rows: ClaimSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { claim?: unknown; source?: unknown; url?: unknown };
    if (typeof row.claim !== "string" || typeof row.source !== "string") continue;
    rows.push({
      claim: row.claim.slice(0, 180),
      source: row.source.slice(0, 240),
      url: typeof row.url === "string" ? row.url : fallback.url,
    });
    if (rows.length >= 8) break;
  }
  return rows.length ? rows : fallback.claimSources;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ScrapedPage = {
  text: string;
  assets: PageAsset[];
  jsonLd: JsonLdProduct | null;
  finalUrl: string;
  howToUse?: string;
  promotion?: string;
  benefits: string[];
};

function jsonLdBlock(json: JsonLdProduct | null): string {
  if (!json) return "";
  return [
    json.name ? `JSON-LD name: ${json.name}` : "",
    json.brand ? `JSON-LD brand: ${json.brand}` : "",
    json.description ? `JSON-LD description: ${json.description}` : "",
    json.price ? `JSON-LD price: ${json.price}` : "",
    json.category ? `JSON-LD category: ${json.category}` : "",
    json.sku ? `JSON-LD sku: ${json.sku}` : "",
    json.rating ? `JSON-LD rating: ${json.rating}` : "",
    json.howToUse ? `JSON-LD how to use: ${json.howToUse}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchPage(url: URL): Promise<ScrapedPage> {
  const [jina, direct] = await Promise.all([
    fetchWithTimeout(`https://r.jina.ai/${url.toString()}`, {
      headers: { Accept: "text/plain", "User-Agent": "UGCFactory/1.0" },
    }, 12000),
    fetchWithTimeout(url.toString(), {
      headers: { "User-Agent": "UGCFactory/1.0", Accept: "text/html" },
      redirect: "follow",
    }, 8000),
  ]);

  let html = "";
  let finalUrl = url.toString();
  if (direct?.ok) {
    html = await direct.text();
    if (direct.url) finalUrl = direct.url;
  }
  const assets = html ? extractPageAssets(html, finalUrl) : [];
  const jsonLd = html ? extractJsonLdProduct(html, finalUrl) : null;
  const stripped = html ? stripHtml(html) : "";

  let text = "";
  if (jina?.ok) {
    text = (await jina.text()).slice(0, 20000);
  } else {
    text = stripped;
  }
  const extra = jsonLdBlock(jsonLd);
  if (extra) text = `${extra}\n\n${text}`.slice(0, 20000);

  return {
    text,
    assets,
    jsonLd,
    finalUrl,
    howToUse: jsonLd?.howToUse || guessHowToUse(text),
    promotion: guessPromotion(text),
    benefits: guessBenefits(text),
  };
}

async function grokBrief(input: {
  pageText: string;
  query: string;
  url?: string;
  assets: PageAsset[];
  jsonLd: JsonLdProduct | null;
  howToUse?: string;
  promotion?: string;
  benefits: string[];
}): Promise<ProductBrief | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const images = input.assets.map((item) => item.url);
  const sourceNote = input.url
    ? [
        `THIS IS THE ONLY PRODUCT. Product URL: ${input.url}`,
        `Ignore any other brand, design tool (Kittl, Canva, Figma), previous product, or website chrome.`,
        jsonLdBlock(input.jsonLd),
        `How to use (from page): ${input.howToUse ?? "not stated"}`,
        `Promotion (from page): ${input.promotion ?? "none on page"}`,
        `Benefits: ${input.benefits.join("; ") || "not listed"}`,
        `Page assets already captured (do not invent image URLs):`,
        input.assets.map((item) => `${item.kind}: ${item.url}`).join("\n") || "none",
        `Extracted page text:\n${input.pageText.slice(0, 10000)}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : `Product description from the user:\n${input.query}\n\nAdditional extracted text:\n${input.pageText.slice(0, 4000)}`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.3,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content:
            `You are a UGC creative director writing a product brief for native ads in global English. Return JSON only. Read this one product page only — do not mix in a second website, brand, or design tool. Do not invent numeric claims the source does not support. Keep every string tight and shootable. Explain what the product is, the problem it solves, how a person uses it, and how it should be promoted on camera. ${GLOBAL_ENGLISH_RULES}`,
        },
        {
          role: "user",
          content: `Write a product brief matching this JSON shape:\n${BRIEF_JSON_SHAPE}\n\nunit = serving or pack unit (1 stick, 30ml). size = sellable size. boxContents = what is in the box, shootable. skus = up to 3 product variants on this campaign. competitor = rival named on the page, or empty. stars / tastesLike / reviewQuotes from the page only. claimSources = each numeric claim with the exact sentence from the page. howToUse = directions from the page. promotion = offer math on the page, not invented. benefits = shootable reasons to buy.\n\n${sourceNote}`,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed: unknown = JSON.parse(stripFence(content));
    const fallback = heuristicBrief({
      query: input.query,
      pageText: input.pageText,
      url: input.url,
      pageImages: images,
      pageAssets: input.assets,
      howToUse: input.howToUse,
      promotion: input.promotion,
      benefits: input.benefits,
    });
    return sanitizeBrief(attachReviews(coerceBrief(parsed, fallback), input.pageText || input.query));
  } catch {
    return null;
  }
}

export const writeProductBrief = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<WriteBriefResult> => {
    const query = data.query.trim();
    const looksLikeUrl =
      /^https?:\/\//i.test(query) ||
      (!/\s/.test(query) && query.includes(".") && query.length < 180);

    let pageText = "";
    let pageAssets: PageAsset[] = [];
    let url: string | undefined;
    let jsonLd: JsonLdProduct | null = null;
    let howToUse: string | undefined;
    let promotion: string | undefined;
    let benefits: string[] = [];

    if (looksLikeUrl) {
      const safe = isSafePublicUrl(
        /^https?:\/\//i.test(query) ? query : `https://${query}`,
      );
      if (!safe) {
        return { ok: false, error: "That URL is not a public http(s) page." };
      }
      const page = await fetchPage(safe);
      url = page.finalUrl || safe.toString();
      pageText = page.text;
      pageAssets = page.assets;
      jsonLd = page.jsonLd;
      howToUse = page.howToUse;
      promotion = page.promotion;
      benefits = page.benefits;
    }

    const images = pageAssets.map((item) => item.url);

    try {
      const fromGrok = await grokBrief({
        pageText: pageText || query,
        query,
        url,
        assets: pageAssets,
        jsonLd,
        howToUse,
        promotion,
        benefits,
      });
      if (fromGrok) {
        const isolated: ProductBrief = sanitizeBrief({
          ...fromGrok,
          url,
          source: url ? "url" : "typed",
          pageImages: images.length ? images : fromGrok.pageImages,
          pageAssets: pageAssets.length ? pageAssets : fromGrok.pageAssets,
          howToUse: fromGrok.howToUse || howToUse,
          promotion: fromGrok.promotion || promotion,
          benefits: fromGrok.benefits?.length ? fromGrok.benefits : benefits,
          voiceSamples: undefined,
        });
        const withRivals = attachRivals(
          isolated,
          await scoutRivals(isolated, pageText || query),
        );
        return { ok: true, brief: withRivals };
      }
    } catch {
      // fall through
    }

    if (looksLikeUrl && !pageText) {
      return {
        ok: false,
        error:
          "Could not read that page. Type demo, or paste a short product description instead.",
      };
    }

    const fallback = heuristicBrief({
      query,
      pageText,
      url,
      pageImages: images,
      pageAssets,
      howToUse,
      promotion,
      benefits,
    });
    try {
      const rivals = await scoutRivals(fallback, pageText || query);
      return { ok: true, brief: attachRivals(fallback, rivals) };
    } catch {
      return { ok: true, brief: fallback };
    }
  });
