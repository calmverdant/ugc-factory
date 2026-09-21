import { FORMAT_BY_ID } from "./catalog";
import { decorateAd } from "./craft";
import { mintAd, nextCombos } from "./mint";
import { comboKey } from "./rng";
import type {
  Combo,
  FactoryFilters,
  FormatId,
  MintedAd,
  ProductBrief,
} from "./types";
import { WEAK_HOOK_FLOOR } from "./types";

/** Format pairs the press auto-tests. Same hook family, two formats. */
export const FORMAT_AB_PAIRS: [FormatId, FormatId][] = [
  ["testimonial", "problem-solution"],
  ["unboxing", "howto"],
  ["silent-text", "pov"],
  ["grwm", "day-in-life"],
];

export function predictedArm(alpha: MintedAd, beta: MintedAd): "alpha" | "beta" | "tie" {
  const a = alpha.hookScore?.value ?? 0;
  const b = beta.hookScore?.value ?? 0;
  if (Math.abs(a - b) < 4) return "tie";
  return a >= b ? "alpha" : "beta";
}

export function formatExperiments(ads: MintedAd[]): MintedAd[][] {
  const map = new Map<string, MintedAd[]>();
  for (const ad of ads) {
    if (!ad.experimentId || ad.hidden || ad.killed) continue;
    const list = map.get(ad.experimentId) ?? [];
    list.push(ad);
    map.set(ad.experimentId, list);
  }
  return [...map.values()].filter((list) => list.length >= 2);
}

export function mintFormatAlphaBeta(
  brief: ProductBrief,
  filters: FactoryFilters,
  used: Set<string>,
  seed: number,
  count = 2,
): { ads: MintedAd[]; used: Set<string>; killed: number } {
  const nextUsed = new Set(used);
  const ads: MintedAd[] = [];
  let killed = 0;
  const pairs = FORMAT_AB_PAIRS.slice(0, Math.max(1, count));

  for (let i = 0; i < pairs.length; i++) {
    const [alphaFormat, betaFormat] = pairs[i]!;
    const experimentId = `abf-${seed.toString(36)}-${i}`;
    const baseFilters: FactoryFilters = {
      ...filters,
      format: alphaFormat,
      desk: "alpha",
    };
    const combos = nextCombos(8, baseFilters, nextUsed, seed + i * 53);
    const source = combos[0];
    if (!source) continue;

    const alphaCombo: Combo = { ...source, format: alphaFormat };
    const betaCombo: Combo = {
      ...source,
      format: betaFormat,
      duration: FORMAT_BY_ID[betaFormat].durations.includes(source.duration)
        ? source.duration
        : (FORMAT_BY_ID[betaFormat].durations[0] ?? source.duration),
    };

    const pairId = experimentId;
    nextUsed.add(comboKey(alphaCombo));
    nextUsed.add(comboKey(betaCombo));

    const alpha = decorateAd(
      {
        ...mintAd(brief, alphaCombo, seed + i * 97, {
          offer: filters.offer,
          pairId,
          abArm: "alpha",
          experimentId,
        }),
      },
      brief,
    );
    const beta = decorateAd(
      {
        ...mintAd(brief, betaCombo, seed + i * 97 + 11, {
          offer: filters.offer,
          pairId,
          abArm: "beta",
          experimentId,
        }),
      },
      brief,
    );

    for (const ad of [alpha, beta]) {
      if ((ad.hookScore?.value ?? 0) < WEAK_HOOK_FLOOR) {
        killed += 1;
        continue;
      }
      ads.push(ad);
    }
  }

  return { ads, used: nextUsed, killed };
}
