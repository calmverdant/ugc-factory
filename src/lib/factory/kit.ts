import { englishOnly } from "./english";
import { applySpelling } from "./locale";
import type { BrandKit, MintedAd, ProductBrief } from "./types";
import { DEFAULT_KIT } from "./types";

const KEY = "ugc-factory-kit";

let cache: BrandKit | null = null;

function cleanList(values: string[]): string[] {
  return values
    .map((item) => englishOnly(item).trim())
    .filter((item) => item.length > 1)
    .slice(0, 12);
}

export function normalizeKit(raw: Partial<BrandKit> | null | undefined): BrandKit {
  return {
    banned: cleanList(raw?.banned ?? []),
    mustSay: cleanList(raw?.mustSay ?? []),
    competitorRule: raw?.competitorRule ?? DEFAULT_KIT.competitorRule,
    spelling: raw?.spelling ?? DEFAULT_KIT.spelling,
    priceLocale: raw?.priceLocale ?? DEFAULT_KIT.priceLocale,
    voiceSamples: cleanList(raw?.voiceSamples ?? []).slice(0, 3),
  };
}

export function peekKit(): BrandKit {
  if (cache) return cache;
  return DEFAULT_KIT;
}

export function loadKit(): BrandKit {
  if (typeof window === "undefined") return DEFAULT_KIT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = DEFAULT_KIT;
      return cache;
    }
    cache = normalizeKit(JSON.parse(raw) as Partial<BrandKit>);
    return cache;
  } catch {
    cache = DEFAULT_KIT;
    return cache;
  }
}

export function saveKit(kit: BrandKit) {
  cache = normalizeKit(kit);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function stripBanned(text: string, banned: string[]): string {
  let next = text;
  for (const word of banned) {
    if (word.length < 2) continue;
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    next = next.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
  }
  return next;
}

function applyCompetitorRule(
  text: string,
  brief: ProductBrief,
  rule: BrandKit["competitorRule"],
): string {
  const name = brief.competitor?.trim();
  if (!name) return text;
  if (rule === "category-only") {
    const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.replace(pattern, `the usual ${brief.category}`);
  }
  return text;
}

function applyMustSay(caption: string, mustSay: string[]): string {
  let next = caption;
  for (const line of mustSay) {
    if (line && !next.toLowerCase().includes(line.toLowerCase().slice(0, 24))) {
      next = `${next}\n${line}`.trim();
    }
  }
  return next;
}

export function applyKitToText(
  text: string,
  brief: ProductBrief,
  kit: BrandKit,
): string {
  const stripped = stripBanned(text, kit.banned);
  const rival = applyCompetitorRule(stripped, brief, kit.competitorRule);
  return applySpelling(rival, kit.spelling);
}

export function applyKitToAd(ad: MintedAd, brief: ProductBrief, kit: BrandKit): MintedAd {
  const map = (text: string) => applyKitToText(text, brief, kit);
  return {
    ...ad,
    hook: map(ad.hook),
    beats: ad.beats.map((beat) => ({
      ...beat,
      line: map(beat.line),
      visual: map(beat.visual),
    })),
    onScreenText: ad.onScreenText.map(map),
    caption: applyMustSay(map(ad.caption), kit.mustSay),
    metaPrimary: map(ad.metaPrimary),
    creatorDirection: ad.creatorDirection.map(map),
    altHooks: ad.altHooks?.map(map),
    endCard: ad.endCard ? map(ad.endCard) : ad.endCard,
  };
}

export function applyKitToAds(
  ads: MintedAd[],
  brief: ProductBrief,
  kit: BrandKit,
): MintedAd[] {
  return ads.map((ad) => applyKitToAd(ad, brief, kit));
}

export function kitVoice(brief: ProductBrief, kit: BrandKit): string[] {
  if (kit.voiceSamples.length) return kit.voiceSamples;
  return brief.voiceSamples ?? [];
}
