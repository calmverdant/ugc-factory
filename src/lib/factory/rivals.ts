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

export async function scoutRivals(brief: ProductBrief, pageText: string): Promise<Rival[]> {
  const mined = mineRivals(pageText, brief.name);
  return sanitizeRivals(mined).filter(
    (item) => item.name.toLowerCase() !== brief.name.toLowerCase(),
  );
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
