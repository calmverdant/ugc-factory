import { FORMAT_BY_ID, PLATFORM_BY_ID } from "./catalog";
import { comboKey } from "./rng";
import type { FormatId, MintedAd, PlatformId } from "./types";
import { FORMAT_IDS, PLATFORM_IDS } from "./types";

export function coverageKey(format: FormatId, platform: PlatformId): string {
  return `${format}|${platform}`;
}

export function coveredCells(ads: MintedAd[]): Set<string> {
  const set = new Set<string>();
  for (const ad of ads) {
    if (ad.hidden || ad.killed) continue;
    set.add(coverageKey(ad.combo.format, ad.combo.platform));
  }
  return set;
}

export function gapCells(ads: MintedAd[]): { format: FormatId; platform: PlatformId }[] {
  const filled = coveredCells(ads);
  const gaps: { format: FormatId; platform: PlatformId }[] = [];
  for (const format of FORMAT_IDS) {
    for (const platform of PLATFORM_IDS) {
      if (!filled.has(coverageKey(format, platform))) {
        gaps.push({ format, platform });
      }
    }
  }
  return gaps;
}

export function matrixRows(ads: MintedAd[]): {
  format: FormatId;
  label: string;
  cells: { platform: PlatformId; short: string; filled: boolean; count: number }[];
}[] {
  const counts = new Map<string, number>();
  for (const ad of ads) {
    if (ad.hidden || ad.killed) continue;
    const key = coverageKey(ad.combo.format, ad.combo.platform);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return FORMAT_IDS.map((format) => ({
    format,
    label: FORMAT_BY_ID[format].label,
    cells: PLATFORM_IDS.map((platform) => ({
      platform,
      short: PLATFORM_BY_ID[platform].short,
      filled: (counts.get(coverageKey(format, platform)) ?? 0) > 0,
      count: counts.get(coverageKey(format, platform)) ?? 0,
    })),
  }));
}

export function usedKeys(ads: MintedAd[]): Set<string> {
  return new Set(ads.map((ad) => comboKey(ad.combo)));
}
