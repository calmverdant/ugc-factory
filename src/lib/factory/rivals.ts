import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { englishOnly, isEnglishish } from "./english";
import { isSafePublicUrl } from "./heuristic";
import type { ProductBrief, Rival } from "./types";

function stripFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function cleanName(value: string): string {
  return englishOnly(value)
    .replace(/\b(vs\.?|versus|compared to|alternative to|instead of)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function mineRivals(text: string, selfName: string): Rival[] {
  const self = selfName.toLowerCase();
  const hits: Rival[] = [];
  const patterns: { re: RegExp; reason: string }[] = [
    { re: /\bvs\.?\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/g, reason: "Named as a vs on the page" },
    { re: /\bversus\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/gi, reason: "Named as a versus on the page" },
    { re: /\bcompared to\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/gi, reason: "Compared on the page" },
    { re: /\binstead of\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/gi, reason: "Positioned as the swap" },
    { re: /\balternative to\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/gi, reason: "Listed as an alternative" },
    { re: /\bbetter than\s+([A-Z][A-Za-z0-9 &.'-]{2,40})/gi, reason: "Claimed as better than" },
  ];
  const seen = new Set<string>();
  for (const { re, reason } of patterns) {
    for (const match of text.matchAll(re)) {
      const name = cleanName(match[1] ?? "");
      const key = name.toLowerCase();
      if (!name || key === self || key.length < 3 || seen.has(key)) continue;
      if (!isEnglishish(name)) continue;
      seen.add(key);
      hits.push({ name, reason });
      if (hits.length >= 4) return hits;
    }
  }
  return hits;
}

export function sanitizeRivals(rivals: Rival[] | undefined): Rival[] {
  const seen = new Set<string>();
  const out: Rival[] = [];
  for (const item of rivals ?? []) {
    const name = cleanName(item.name);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const url =
      item.url && isSafePublicUrl(item.url) ? isSafePublicUrl(item.url)!.toString() : undefined;
    out.push({
      name,
      url,
      reason: englishOnly(item.reason || "Category rival").slice(0, 140),
      price: item.price ? englishOnly(item.price).slice(0, 24) : undefined,
    });
    if (out.length >= 4) break;
  }
  return out;
}

function parseRivals(raw: unknown): Rival[] {
  if (!Array.isArray(raw)) return [];
  const out: Rival[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { name?: unknown; url?: unknown; reason?: unknown; price?: unknown };
    if (typeof row.name !== "string" || !row.name.trim()) continue;
    out.push({
      name: row.name.trim(),
      url: typeof row.url === "string" ? row.url.trim() : undefined,
      reason: typeof row.reason === "string" ? row.reason.trim() : "Category rival",
      price: typeof row.price === "string" ? row.price.trim() : undefined,
    });
  }
  return sanitizeRivals(out);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "UGCFactory/1.0", Accept: "text/html" },
      redirect: "follow",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyRivalUrl(raw: string | undefined): Promise<string | undefined> {
  if (!raw) return undefined;
  const safe = isSafePublicUrl(raw);
  if (!safe) return undefined;
  const res = await fetchWithTimeout(safe.toString(), 3000);
  if (!res?.ok) return undefined;
  return safe.toString();
}

async function grokRivals(input: {
  name: string;
  brand: string;
  category: string;
  pageText: string;
  url?: string;
}): Promise<Rival[]> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return [];
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You scout real product competitors for UGC ads. Return JSON only. English only. Do not invent a URL you are not confident is a real public https product page. Empty string url is better than a guess. Never use Amazon search pages. Prefer official brand product URLs.",
        },
        {
          role: "user",
          content: `Product: ${input.name} (${input.brand}) in ${input.category}.
Page URL: ${input.url ?? "none"}
Page text (excerpt):
${input.pageText.slice(0, 4000)}

Return JSON: {"rivals":[{"name":string,"url":string,"reason":string,"price":string}]}
Up to 3 real rivals a shopper would actually compare. reason = one shootable sentence. price like $38 if known, else empty.`,
        },
      ],
    }),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return [];
  try {
    const parsed: unknown = JSON.parse(stripFence(content));
    const rivals =
      parsed && typeof parsed === "object" && "rivals" in parsed
        ? parseRivals((parsed as { rivals: unknown }).rivals)
        : parseRivals(parsed);
    return rivals;
  } catch {
    return [];
  }
}

export async function scoutRivals(brief: ProductBrief, pageText: string): Promise<Rival[]> {
  const mined = mineRivals(pageText, brief.name);
  let grok: Rival[] = [];
  try {
    grok = await grokRivals({
      name: brief.name,
      brand: brief.brand,
      category: brief.category,
      pageText,
      url: brief.url,
    });
  } catch {
    grok = [];
  }
  const merged = sanitizeRivals([...grok, ...mined]).filter(
    (item) => item.name.toLowerCase() !== brief.name.toLowerCase(),
  );
  const verified = await Promise.all(
    merged.slice(0, 3).map(async (rival) => ({
      ...rival,
      url: await verifyRivalUrl(rival.url),
    })),
  );
  return sanitizeRivals(verified);
}

export function attachRivals(brief: ProductBrief, rivals: Rival[]): ProductBrief {
  const list = sanitizeRivals(rivals);
  if (!list.length) return brief;
  const lead = list[0]!;
  return {
    ...brief,
    rivals: list,
    competitor: brief.competitor || lead.name,
    competitorUrl: brief.competitorUrl || lead.url,
  };
}

const ScoutInput = z.object({
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  pageText: z.string().max(12000).optional(),
  url: z.string().optional(),
  competitor: z.string().optional(),
});

/** Extra scout pass if the brief writer missed rivals. */
export const scoutProductRivals = createServerFn({ method: "POST" })
  .validator((input: unknown) => ScoutInput.parse(input))
  .handler(async ({ data }): Promise<{ rivals: Rival[] }> => {
    const brief: ProductBrief = {
      name: data.name,
      brand: data.brand,
      category: data.category,
      price: "",
      oneLiner: "",
      problem: "",
      outcome: "",
      mechanism: "",
      claims: [],
      proof: [],
      objections: [],
      audience: "",
      ingredients: [],
      differentiator: "",
      cta: "",
      setting: "",
      wardrobe: "",
      url: data.url,
      source: data.url ? "url" : "typed",
      competitor: data.competitor,
    };
    const rivals = await scoutRivals(brief, data.pageText ?? data.competitor ?? data.category);
    return { rivals };
  });
