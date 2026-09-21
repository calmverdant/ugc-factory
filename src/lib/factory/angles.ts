import { decorateAd } from "./craft";
import { mintAd, nextCombos } from "./mint";
import { comboKey } from "./rng";
import type {
  AngleId,
  Combo,
  Creator,
  FactoryFilters,
  MintedAd,
  ProductBrief,
  WinnerMemory,
} from "./types";
import { ANGLE_IDS } from "./types";
import { autoAssign } from "./desk";

export const ANGLES: { id: AngleId; label: string; hint: string; format?: Combo["format"] }[] = [
  { id: "price", label: "Price", hint: "What the number actually buys" },
  { id: "proof", label: "Proof", hint: "Stars, survey, third-party" },
  { id: "ritual", label: "Ritual", hint: "Where it sits in the day" },
  { id: "identity", label: "Identity", hint: "Who uses this, without a costume" },
  { id: "vs-rival", label: "Vs rival", hint: "Name them or the category, no mock" },
];

const ANGLE_HOOK: Record<AngleId, Combo["hook"]> = {
  price: "what-price-gets",
  proof: "honest-review",
  ritual: "day-n",
  identity: "if-you-struggle",
  "vs-rival": "switched",
};

const ANGLE_FORMAT: Record<AngleId, Combo["format"]> = {
  price: "listicle",
  proof: "testimonial",
  ritual: "day-in-life",
  identity: "wish-i-knew",
  "vs-rival": "comparison",
};

export function mintAngles(
  brief: ProductBrief,
  filters: FactoryFilters,
  used: Set<string>,
  seed: number,
  creators: Creator[] = [],
): { ads: MintedAd[]; used: Set<string>; killed: number } {
  const nextUsed = new Set(used);
  const ads: MintedAd[] = [];
  let killed = 0;
  for (let i = 0; i < ANGLE_IDS.length; i++) {
    const angle = ANGLE_IDS[i]!;
    const scoped: FactoryFilters = {
      ...filters,
      format: ANGLE_FORMAT[angle],
      desk: "shelf",
    };
    const combos = nextCombos(6, scoped, nextUsed, seed + i * 29).filter(
      (combo) => combo.hook === ANGLE_HOOK[angle] || combo.format === ANGLE_FORMAT[angle],
    );
    const combo =
      combos[0] ??
      nextCombos(1, { ...scoped, format: ANGLE_FORMAT[angle] }, nextUsed, seed + i * 31)[0];
    if (!combo) continue;
    const locked: Combo = {
      ...combo,
      format: ANGLE_FORMAT[angle],
      hook: ANGLE_HOOK[angle],
    };
    nextUsed.add(comboKey(locked));
    let ad = mintAd(brief, locked, seed + i * 97, {
      offer: filters.offer,
      angle,
    });
    ad = autoAssign(ad, creators);
    if ((ad.hookScore?.value ?? 0) < 50) {
      killed += 1;
      continue;
    }
    ads.push(ad);
  }
  return { ads, used: nextUsed, killed };
}

export function mintLine(
  brief: ProductBrief,
  filters: FactoryFilters,
  used: Set<string>,
  seed: number,
  creators: Creator[] = [],
): { ads: MintedAd[]; used: Set<string> } {
  const skus = (brief.skus ?? []).filter(Boolean).slice(0, 3);
  const names = skus.length ? skus : [brief.name, `${brief.name} travel`, `${brief.name} set`].slice(0, 3);
  const persona = filters.persona === "all" ? "convert" : filters.persona;
  const nextUsed = new Set(used);
  const ads: MintedAd[] = [];
  for (let i = 0; i < names.length; i++) {
    const sku = names[i]!;
    const scoped: FactoryFilters = {
      ...filters,
      persona,
      format: filters.format === "all" ? "testimonial" : filters.format,
    };
    const combos = nextCombos(4, scoped, nextUsed, seed + i * 11);
    const combo = combos[0];
    if (!combo) continue;
    nextUsed.add(comboKey(combo));
    let ad = mintAd(brief, { ...combo, persona }, seed + i * 53, {
      offer: filters.offer,
      sku,
    });
    const card = `${sku} · ${brief.price} · ${brief.cta}`;
    ad = decorateAd(
      {
        ...ad,
        sku,
        endCard: card,
        beats: ad.beats.map((beat, idx) =>
          idx === ad.beats.length - 1
            ? { ...beat, line: `${beat.line} End on ${sku}.` }
            : beat,
        ),
      },
      brief,
    );
    ads.push(autoAssign(ad, creators));
  }
  return { ads, used: nextUsed };
}

export function cloneKeeper(
  brief: ProductBrief,
  memory: WinnerMemory,
  used: Set<string>,
  seed: number,
  offer: FactoryFilters["offer"],
): { ad: MintedAd; used: Set<string> } | null {
  const combo: Combo = {
    format: memory.format,
    hook: memory.hookFamily,
    persona: memory.persona,
    platform: memory.platform,
    duration: 30,
  };
  const nextUsed = new Set(used);
  nextUsed.add(comboKey(combo));
  const ad = mintAd(brief, combo, seed, { offer });
  return { ad, used: nextUsed };
}
