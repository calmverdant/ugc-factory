import {
  FORMAT_BY_ID,
  FORMATS,
  HOOK_BY_ID,
  PERSONA_BY_ID,
  PERSONAS,
  PLATFORM_BY_ID,
  PLATFORMS,
} from "./catalog";
import { gapCells } from "./matrix";
import { comboKey, mulberry32, pick, pickN, type Rng } from "./rng";
import { decorateAd, echoVoice } from "./craft";
import { offerLine } from "./offers";
import type {
  Beat,
  Combo,
  Duration,
  FactoryFilters,
  FormatId,
  MintedAd,
  OfferId,
  ProductBrief,
  Shot,
  AngleId,
} from "./types";
import { DURATIONS, FORMAT_IDS, HOOK_IDS, PERSONA_IDS, PLATFORM_IDS, WEAK_HOOK_FLOOR } from "./types";

type Ctx = {
  brief: ProductBrief;
  rng: Rng;
  formatId: FormatId;
  offerLine: string;
};

type ListKey =
  | "claims"
  | "proof"
  | "objections"
  | "ingredients"
  | "skus"
  | "voiceSamples"
  | "reviewQuotes"
  | "pageImages";

function one(brief: ProductBrief, key: ListKey, rng: Rng): string {
  const value = brief[key];
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    return pick(rng, value);
  }
  if (typeof value === "string") return value;
  return "";
}

function ctaWord(brief: ProductBrief): string {
  const token = brief.name.split(/\s+/)[0] ?? "LINK";
  return token.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "LINK";
}

function interpolate(template: string, ctx: Ctx): string {
  const { brief, rng } = ctx;
  return template
    .replaceAll("{name}", brief.name)
    .replaceAll("{brand}", brief.brand)
    .replaceAll("{category}", brief.category)
    .replaceAll("{price}", brief.price)
    .replaceAll("{oneLiner}", brief.oneLiner)
    .replaceAll("{problem}", brief.problem)
    .replaceAll("{outcome}", brief.outcome)
    .replaceAll("{mechanism}", brief.mechanism)
    .replaceAll("{differentiator}", brief.differentiator)
    .replaceAll("{cta}", brief.cta)
    .replaceAll("{setting}", brief.setting)
    .replaceAll("{wardrobe}", brief.wardrobe)
    .replaceAll("{audience}", brief.audience)
    .replaceAll("{cta-word}", ctaWord(brief))
    .replaceAll("{howToUse}", brief.howToUse || brief.mechanism)
    .replaceAll("{promotion}", brief.promotion || "")
    .replaceAll("{claim}", one(brief, "claims", rng))
    .replaceAll("{proof}", one(brief, "proof", rng))
    .replaceAll("{objection}", one(brief, "objections", rng))
    .replaceAll("{ingredient}", one(brief, "ingredients", rng))
    .replaceAll("{competitor}", brief.competitor || one(brief, "objections", rng) || "the usual option")
    .replaceAll("{unit}", brief.unit || brief.name)
    .replaceAll("{size}", brief.size || "")
    .replaceAll("{box}", brief.boxContents || one(brief, "ingredients", rng))
    .replaceAll("{sku}", (brief.skus && brief.skus[0]) || brief.name)
    .replace(/\s+/g, " ")
    .trim();
}

function stampTimes(duration: Duration, count: number): { start: number; end: number }[] {
  const edges: number[] = [0];
  for (let i = 1; i < count; i++) {
    edges.push(Math.round((duration * i) / count));
  }
  edges.push(duration);
  const unique = [...new Set(edges)].sort((a, b) => a - b);
  const spans: { start: number; end: number }[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    spans.push({ start: unique[i]!, end: unique[i + 1]! });
  }
  return spans;
}

const VALUE_LINES = [
  "This is {name}. {mechanism}.",
  "{name} — {oneLiner}",
  "The move is {name}. {differentiator}.",
  "What I actually use is {name}. {claim}.",
];

const PROOF_LINES = [
  "{proof}. That is why I stayed.",
  "I cared about {proof}. Then {claim}.",
  "If you need a reason besides vibes: {proof}.",
  "{price}. {differentiator}.",
];

const SETUP_LINES = [
  "I was stuck with {problem}.",
  "The old version of this was {objection}.",
  "Every other {category} I tried still left me with {problem}.",
  "I kept buying things that did {objection}.",
];

const HOWTO_LINES = [
  "You use it like this: {mechanism}.",
  "No ceremony. {mechanism}.",
  "The only step that matters: {mechanism}.",
];

const CLOSE_LINES = [
  "If {problem} is still the plot, this is the swap.",
  "I am not saying it is magic. I am saying it {outcome}.",
  "That is the whole review. {cta}.",
];

function formatVisuals(formatId: FormatId, ctx: Ctx): string[] {
  const setting = ctx.brief.setting;
  const shared = [
    `talking head in ${setting}`,
    `hands on ${ctx.brief.name} in ${setting}`,
    `insert of the label, then back to face`,
  ];
  const extra: Record<FormatId, string[]> = {
    "problem-solution": [
      `cutaway of the problem in ${setting}`,
      `product enters frame, unceremonious`,
    ],
    unboxing: [
      "overhead table, mailer tearing, no tablecloth",
      "first-use close-up, genuine reaction",
    ],
    "day-in-life": [
      "three time-of-day jump cuts, same wardrobe language",
      `product as a repeating object in ${setting}`,
    ],
    testimonial: [
      "locked-off mid-shot, then one punch-in on the proof line",
      "hold the product at chest, not in front of the face",
    ],
    "before-after": [
      "before beat is messy and a little unkind, after is the same room",
      "hard cut on the outcome line, no dissolve",
    ],
    grwm: [
      "mirror selfie angle, product as a step in the sequence",
      "sink, clip, apply or use, keep moving",
    ],
    "myth-bust": [
      "on-screen myth as big type, then a shake-head",
      "demonstrate the opposite in one uninterrupted take",
    ],
    listicle: [
      "hard cuts on 1 / 2 / 3 with matching on-screen numbers",
      "product hero only on point three",
    ],
    pov: [
      "camera as the viewer, product entering from below frame",
      "no talking-head; hands and voiceover only",
    ],
    "green-screen": [
      "creator on the right third, product page or reviews behind",
      "pinch-zoom a review, then cut to the real object",
    ],
    "walk-and-talk": [
      "handheld walk through a hallway or sidewalk, product in one hand",
      "stop walking only for the demo",
    ],
    "silent-text": [
      "extreme close-ups, texture, no mouth on camera",
      "type-on captions covering 40% of the frame, safe margins",
    ],
    "street-interview": [
      "self as both interviewer and subject, jump-cut answers",
      "product reveal at the end like a punchline",
    ],
    howto: [
      "overhead demo, then a face take for why it matters",
      "slow enough to copy, not a montage",
    ],
    "wish-i-knew": [
      "list on fingers, then the product as the last lesson",
      "sit on the bed or floor, confessional height",
    ],
    comparison: [
      "old object left, {name} right, same lighting",
      "one decisive use of the winner",
    ],
  };
  return [...shared, ...extra[formatId]].map((line) => interpolate(line, ctx));
}

function beatLabels(formatId: FormatId, count: number): string[] {
  if (count <= 3) return ["Hook", "Value", "CTA"];
  if (formatId === "listicle") return ["Hook", "One", "Two", "Three", "CTA"].slice(0, count);
  if (formatId === "howto") return ["Hook", "Setup", "Step", "Why", "CTA"].slice(0, count);
  if (count === 4) return ["Hook", "Setup", "Value", "CTA"];
  if (count >= 6) return ["Hook", "Setup", "Demo", "Proof", "Soft sell", "CTA"];
  return ["Hook", "Setup", "Value", "Proof", "CTA"];
}

function buildLines(ctx: Ctx, combo: Combo, count: number): string[] {
  const hook = pick(ctx.rng, HOOK_BY_ID[combo.hook].lines);
  const aside = pick(ctx.rng, PERSONA_BY_ID[combo.persona].aside);
  const value = pick(ctx.rng, VALUE_LINES);
  const proof = pick(ctx.rng, PROOF_LINES);
  const setup = pick(ctx.rng, SETUP_LINES);
  const howto = pick(ctx.rng, HOWTO_LINES);
  const close = pick(ctx.rng, CLOSE_LINES);
  const cta = pick(ctx.rng, PLATFORM_BY_ID[combo.platform].ctaLines);

  const claim1 = one(ctx.brief, "claims", ctx.rng);
  const claim2 = one(ctx.brief, "claims", ctx.rng);
  const ing = one(ctx.brief, "ingredients", ctx.rng);

  const middle: Record<FormatId, string[]> = {
    "problem-solution": [setup, aside, value, proof],
    unboxing: [
      "Mailer, packing, the object. No music swell.",
      aside,
      `First use: ${howto}`,
      proof,
    ],
    "day-in-life": [
      `Morning, noon, night — {name} is the repeating beat.`,
      aside,
      value,
      "It stopped being a bit. It is just in the day now.",
    ],
    testimonial: [aside, setup, value, proof],
    "before-after": [
      "Before: {problem}.",
      aside,
      `After: {outcome}. ${claim1}.`,
      proof,
    ],
    grwm: [
      "I am not doing a full glam. This is the actual order.",
      aside,
      howto,
      value,
    ],
    "myth-bust": [
      `Myth: {objection}.`,
      aside,
      `Reality: {mechanism}.`,
      proof,
    ],
    listicle: [
      `One. ${claim1}.`,
      `Two. ${ing} is the part I actually care about.`,
      `Three. ${claim2}.`,
      proof,
    ],
    pov: [
      "You pick it up because {problem} is loud today.",
      aside,
      value,
      "You put it back on the shelf like it belongs there.",
    ],
    "green-screen": [
      "This is the page. This is the part they hide below the fold.",
      aside,
      value,
      proof,
    ],
    "walk-and-talk": [setup, aside, value, close],
    "silent-text": [
      "{problem}.",
      "{name}.",
      "{claim}.",
      "{cta}.",
    ],
    "street-interview": [
      `"What do you use for {category}?"`,
      aside,
      `"Okay but have you tried {name}?"`,
      value,
    ],
    howto: [howto, aside, value, proof],
    "wish-i-knew": [
      "I wish I knew {objection} was optional.",
      aside,
      `I wish I knew {differentiator}.`,
      value,
    ],
    comparison: [
      "Left: {competitor}. Right: {name}.",
      aside,
      value,
      "I kept the one that {outcome}.",
    ],
  };

  const body = middle[combo.format].map((line) => interpolate(line, ctx));
  const lines = [
    interpolate(hook, ctx),
    ...body,
    interpolate(close, ctx),
    interpolate(cta, ctx),
  ];

  if (combo.format === "silent-text") {
    const silent = [
      interpolate("Still {problem}?", ctx),
      interpolate("{name} — {oneLiner}", ctx),
      interpolate("{claim}. {proof}.", ctx),
      interpolate("{cta}.", ctx),
    ].slice(0, count);
    if (ctx.offerLine && silent.length) {
      silent[silent.length - 1] = `${silent[silent.length - 1]} ${ctx.offerLine}`;
    }
    return silent;
  }

  const out: string[] = [lines[0]!];
  const needed = Math.max(0, count - 2);
  const pool = lines.slice(1, -1);
  for (let i = 0; i < needed; i++) {
    out.push(pool[i % pool.length]!);
  }
  out.push(lines[lines.length - 1]!);
  if (ctx.offerLine && out.length) {
    out[out.length - 1] = `${out[out.length - 1]} ${ctx.offerLine}`;
  }
  return out.slice(0, count);
}

function onScreenText(ctx: Ctx, combo: Combo, hookLine: string): string[] {
  if (combo.format === "silent-text") {
    return [
      interpolate("{problem}", ctx),
      interpolate("{name}", ctx),
      interpolate("{claim}", ctx),
      interpolate("{cta}", ctx),
    ];
  }
  const bits = [
    hookLine,
    interpolate("{name}", ctx),
    interpolate("{price}", ctx),
    interpolate("{claim}", ctx),
  ];
  if (combo.platform === "pinterest") {
    bits.push(interpolate("{category} routine", ctx));
  }
  if (ctx.brief.size) bits.push(interpolate("{size}", ctx));
  if (ctx.brief.unit) bits.push(interpolate("{unit}", ctx));
  return [...new Set(bits)].slice(0, 4);
}

function hashtags(brief: ProductBrief, platform: Combo["platform"], rng: Rng): string[] {
  const cat = brief.category.replace(/\s+/g, "");
  const brand = brief.brand.replace(/\s+/g, "");
  const pool = [
    cat,
    brand,
    "ugc",
    "ugcads",
    "creator",
    brief.outcome.split(" ").slice(0, 2).join(""),
  ];
  const platformBits: Record<Combo["platform"], string[]> = {
    tiktok: ["tiktokmademebuyit", "fyp", "honestreview"],
    reels: ["reels", "saved", "routine"],
    shorts: ["shorts", "review", "howto"],
    meta: ["adcreative", "ugccreator", "review"],
    pinterest: ["pinterestfinds", "howto", "routine"],
  };
  const picked = pickN(rng, [...pool, ...platformBits[platform]], 6)
    .map((tag) => tag.replace(/[^A-Za-z0-9]/g, "").slice(0, 24))
    .filter((tag) => tag.length > 2);
  return [...new Set(picked)].slice(0, 6);
}

function captionFor(ctx: Ctx, combo: Combo, hookLine: string): string {
  const nameLine = interpolate("{name} — {oneLiner}", ctx);
  const proof = interpolate("{proof}", ctx);
  let caption: string;
  if (combo.platform === "meta") {
    caption = `${hookLine}\n\n${nameLine}\n${proof}\n\n${interpolate("{cta}.", ctx)}`;
  } else if (combo.platform === "pinterest") {
    caption = `${interpolate("{name} {category} routine", ctx)}\n${nameLine}\n${interpolate("Why it works: {mechanism}.", ctx)}`;
  } else if (combo.platform === "shorts") {
    caption = `${ctx.brief.name} review: ${ctx.brief.oneLiner} ${proof}`;
  } else {
    caption = `${hookLine} ${interpolate("{cta}.", ctx)}`;
  }
  return echoVoice(caption, ctx.brief.voiceSamples);
}

function metaPrimary(ctx: Ctx, hookLine: string): string {
  return `${hookLine} ${interpolate("{name} is {price}. {differentiator}. {proof}. {cta}.", ctx)}`;
}

function shotList(ctx: Ctx, combo: Combo, duration: Duration, visuals: string[]): Shot[] {
  const count = duration <= 15 ? 4 : duration <= 30 ? 5 : 6;
  const spans = stampTimes(duration, count);
  const box = ctx.brief.boxContents
    ? `What's in the box: ${ctx.brief.boxContents}`
    : "Product packshot, still, readable";
  const frames = [
    "Hook frame, face or texture fills the screen",
    visuals[0] ?? ctx.brief.setting,
    visuals[1] ?? `hands using ${ctx.brief.name}`,
    "Proof moment — review, result, or label",
    box,
    "End card: name + price + CTA, lower fifth clear of UI",
  ];
  const notes = [
    PERSONA_BY_ID[combo.persona].camera,
    "Natural light only. No ring-light catchlight if you can help it.",
    `Wardrobe: ${ctx.brief.wardrobe}.`,
    "Hold the product the way a person holds it, not a catalog grip.",
    "Leave 1s of handles at head and tail.",
    `${PLATFORM_BY_ID[combo.platform].aspect}. Captions inside safe margins. End card sits above the platform UI.`,
  ];
  return spans.map((span, i) => ({
    start: span.start,
    end: span.end,
    frame: interpolate(frames[i] ?? frames[frames.length - 1]!, ctx),
    note: notes[i] ?? notes[0]!,
  }));
}

function direction(ctx: Ctx, combo: Combo): string[] {
  const persona = PERSONA_BY_ID[combo.persona];
  const format = FORMAT_BY_ID[combo.format];
  const extra = [
    ctx.brief.unit ? interpolate("Show the unit: {unit}.", ctx) : "",
    ctx.brief.size ? interpolate("Readable size mark: {size}.", ctx) : "",
    ctx.brief.boxContents ? interpolate("What's in the box: {box}.", ctx) : "",
    ctx.brief.competitor && combo.format === "comparison"
      ? interpolate("Name {competitor} without mocking it.", ctx)
      : "",
  ].filter(Boolean);
  return [
    `Energy: ${persona.energy}.`,
    `Camera: ${persona.camera}.`,
    `Format: ${format.blurb}`,
    interpolate("Setting: {setting}.", ctx),
    interpolate("Wardrobe: {wardrobe}.", ctx),
    "Do not smile on the hook. Earn it later if it happens.",
    "Sound-off first: if the on-screen text disappeared, the video should still make sense.",
    interpolate("Show {name} in use by second {second}.", {
      ...ctx,
      brief: ctx.brief,
    }).replace("{second}", combo.duration <= 15 ? "4" : "7"),
    `Platform crop is ${PLATFORM_BY_ID[combo.platform].aspect}. Keep eyes in the upper third.`,
    ...extra,
  ];
}

function imagePrompt(ctx: Ctx, combo: Combo): string {
  const personaLook: Record<string, string> = {
    skeptic: "late-20s person with a dry expression, slightly tired eyes",
    convert: "person mid-laugh, a little sheepish, real skin texture",
    parent: "30s adult in a lived-in kitchen, soft under-eye reality",
    maximalist: "neat person, organized shelves behind them",
    student: "early-20s in a small apartment, window light, desk clutter",
    creator: "handheld self-shot, craft-aware but not glam",
  };
  return [
    "Authentic UGC still photograph, iPhone, not a studio campaign.",
    personaLook[combo.persona],
    interpolate("holding {name} ({category}) in {setting}.", ctx),
    interpolate("wardrobe: {wardrobe}.", ctx),
    ctx.brief.size ? interpolate("pack size {size} readable.", ctx) : "",
    "natural window light, slight mess, real skin, no beauty retouching,",
    "no logo lockup, no glossy packshot lighting, 4:5 crop.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function nextCombos(
  count: number,
  filters: FactoryFilters,
  used: Set<string>,
  seed: number,
  prefer?: { format?: string; platform?: string; hook?: string }[],
): Combo[] {
  const rng = mulberry32(seed);
  const formats = filters.format === "all" ? FORMAT_IDS : [filters.format];
  const personas = filters.persona === "all" ? PERSONA_IDS : [filters.persona];
  const platforms = filters.platform === "all" ? PLATFORM_IDS : [filters.platform];
  const hooks = HOOK_IDS;

  const pool: Combo[] = [];
  for (const format of formats) {
    for (const hook of hooks) {
      for (const persona of personas) {
        for (const platform of platforms) {
          const overlap = DURATIONS.filter((d) => {
            if (filters.duration !== "all") return d === filters.duration;
            return (
              FORMAT_BY_ID[format].durations.includes(d) &&
              PLATFORM_BY_ID[platform].durations.includes(d)
            );
          });
          const durations = overlap.length
            ? overlap
            : filters.duration === "all"
              ? FORMAT_BY_ID[format].durations
              : ([filters.duration] as Duration[]);
          for (const duration of durations) {
            const combo: Combo = { format, hook, persona, platform, duration };
            if (!used.has(comboKey(combo))) pool.push(combo);
          }
        }
      }
    }
  }

  const source =
    pool.length > 0
      ? pool
      : formats.flatMap((format) =>
          hooks.flatMap((hook) =>
            personas.flatMap((persona) =>
              platforms.map((platform) => ({
                format,
                hook,
                persona,
                platform,
                duration: FORMAT_BY_ID[format].durations[0] ?? 30,
              })),
            ),
          ),
        );

  const shuffled = pickN(rng, source, source.length);
  if (prefer && prefer.length) {
    shuffled.sort((a, b) => {
      let as = 0;
      let bs = 0;
      for (const preferred of prefer) {
        as +=
          (a.format === preferred.format ? 3 : 0) +
          (a.platform === preferred.platform ? 2 : 0) +
          (a.hook === preferred.hook ? 2 : 0);
        bs +=
          (b.format === preferred.format ? 3 : 0) +
          (b.platform === preferred.platform ? 2 : 0) +
          (b.hook === preferred.hook ? 2 : 0);
      }
      return bs - as;
    });
  }
  const out: Combo[] = [];
  const seen = new Set<string>();
  for (const combo of shuffled) {
    const key = comboKey(combo);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(combo);
    if (out.length >= count) break;
  }
  return out;
}

let adSerial = 0;

export function resetSerial(n = 0) {
  adSerial = n;
}

export function mintAd(
  brief: ProductBrief,
  combo: Combo,
  seed: number,
  extras?: {
    offer?: OfferId;
    pairId?: string;
    angle?: AngleId;
    sku?: string;
    openGroupId?: string;
    abArm?: "alpha" | "beta";
    experimentId?: string;
  },
): MintedAd {
  const rng = mulberry32(seed);
  const duration = combo.duration;
  const offer = extras?.offer ?? "none";
  const ctx: Ctx = {
    brief,
    rng,
    formatId: combo.format,
    offerLine: offerLine(offer),
  };
  const beatCount = duration <= 15 ? 3 : duration <= 30 ? 5 : 6;
  const labels = beatLabels(combo.format, beatCount);
  const lines = buildLines(ctx, combo, beatCount);
  const spans = stampTimes(duration, beatCount);
  const visuals = formatVisuals(combo.format, ctx);
  const beats: Beat[] = spans.map((span, i) => ({
    start: span.start,
    end: span.end,
    label: labels[i] ?? "Beat",
    line: lines[i] ?? lines[lines.length - 1]!,
    visual: visuals[i % visuals.length]!,
  }));
  adSerial += 1;
  const hookLine = beats[0]?.line ?? interpolate(pick(rng, HOOK_BY_ID[combo.hook].lines), ctx);
  let caption = captionFor(ctx, combo, hookLine);
  if (ctx.offerLine) caption = `${caption}\n${ctx.offerLine}`;
  const sku = extras?.sku ?? (brief.skus && brief.skus[0]) ?? undefined;
  const altPool = HOOK_IDS.filter((id) => id !== combo.hook);
  const altHooks: string[] = [];
  for (let i = 0; i < 3 && altPool.length; i++) {
    const id = pick(rng, altPool);
    const idx = altPool.indexOf(id);
    if (idx >= 0) altPool.splice(idx, 1);
    altHooks.push(interpolate(pick(rng, HOOK_BY_ID[id].lines), ctx));
  }
  const raw: MintedAd = {
    id: `${comboKey(combo)}-${seed}-${adSerial}`,
    number: adSerial,
    combo,
    formatLabel: FORMAT_BY_ID[combo.format].label,
    hookLabel: HOOK_BY_ID[combo.hook].label,
    personaLabel: PERSONA_BY_ID[combo.persona].label,
    platformLabel: PLATFORM_BY_ID[combo.platform].short,
    hook: hookLine,
    beats,
    onScreenText: onScreenText(ctx, combo, hookLine),
    caption,
    hashtags: hashtags(brief, combo.platform, rng),
    metaPrimary: metaPrimary(ctx, hookLine),
    shotList: shotList(ctx, combo, duration, visuals),
    creatorDirection: direction(ctx, combo),
    imagePrompt: imagePrompt(ctx, combo),
    pinned: false,
    hidden: false,
    note: "",
    pairId: extras?.pairId,
    offer,
    mintedAt: Date.now(),
    abLosses: 0,
    legalStamp: "none",
    sparkCode: "",
    utm: "",
    altHooks,
    angle: extras?.angle,
    sku,
    openGroupId: extras?.openGroupId,
    abArm: extras?.abArm,
    experimentId: extras?.experimentId,
    endCard: sku ? `${sku} · ${brief.price} · ${brief.cta}` : undefined,
  };
  return decorateAd(raw, brief);
}

export function winningSeeds(ads: MintedAd[]): MintedAd[] {
  const marked = ads.filter((ad) => ad.winner && !ad.hidden && !ad.killed);
  if (marked.length) return marked.slice(0, 3);
  return ads
    .filter((ad) => {
      const n = Number.parseFloat(ad.ctr ?? "");
      return Number.isFinite(n) && n > 0 && !ad.hidden && !ad.killed;
    })
    .sort((a, b) => Number.parseFloat(b.ctr ?? "0") - Number.parseFloat(a.ctr ?? "0"))
    .slice(0, 3);
}

export function mintBatch(
  brief: ProductBrief,
  filters: FactoryFilters,
  used: Set<string>,
  count: number,
  seed: number,
  winners: MintedAd[] = [],
): { ads: MintedAd[]; used: Set<string>; killed: number } {
  const prefer: { format?: string; platform?: string; hook?: string }[] =
    winners.slice(0, 3).map((ad) => ({
      format: ad.combo.format,
      platform: ad.combo.platform,
      hook: ad.combo.hook,
    }));
  const combos = nextCombos(count * 3, filters, used, seed, prefer);
  const nextUsed = new Set(used);
  const ads: MintedAd[] = [];
  let killed = 0;
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i]!;
    nextUsed.add(comboKey(combo));
    const ad = mintAd(brief, combo, seed + i * 97 + combo.hook.length * 13, {
      offer: filters.offer,
    });
    if ((ad.hookScore?.value ?? 0) < WEAK_HOOK_FLOOR) {
      killed += 1;
      continue;
    }
    ads.push(ad);
    if (ads.length >= count) break;
  }
  return { ads, used: nextUsed, killed };
}

export function mintGaps(
  brief: ProductBrief,
  ads: MintedAd[],
  used: Set<string>,
  seed: number,
  offer: OfferId,
): { ads: MintedAd[]; used: Set<string>; killed: number } {
  const gaps = gapCells(ads).slice(0, 8);
  const nextUsed = new Set(used);
  const minted: MintedAd[] = [];
  let killed = 0;
  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    const filters: FactoryFilters = {
      format: gap.format,
      persona: "all",
      platform: gap.platform,
      duration: "all",
      offer,
      view: "all",
      desk: "matrix",
    };
    const combos = nextCombos(4, filters, nextUsed, seed + i * 19);
    const combo = combos[0];
    if (!combo) continue;
    nextUsed.add(comboKey(combo));
    const ad = mintAd(brief, combo, seed + i * 97, { offer });
    if ((ad.hookScore?.value ?? 0) < WEAK_HOOK_FLOOR) {
      killed += 1;
      continue;
    }
    minted.push(ad);
  }
  return { ads: minted, used: nextUsed, killed };
}

export function mintChallenger(
  brief: ProductBrief,
  source: MintedAd,
  used: Set<string>,
  seed: number,
): { ad: MintedAd; used: Set<string> } | null {
  const filters: FactoryFilters = {
    format: source.combo.format,
    persona: source.combo.persona,
    platform: source.combo.platform,
    duration: source.combo.duration,
    offer: source.offer ?? "none",
    view: "all",
    desk: "ab",
  };
  const nextUsed = new Set(used);
  const combos = nextCombos(8, filters, nextUsed, seed).filter(
    (combo) => combo.hook !== source.combo.hook,
  );
  const combo = combos[0];
  if (!combo) return null;
  nextUsed.add(comboKey(combo));
  const pairId = source.pairId ?? source.id;
  const ad = mintAd(brief, combo, seed + 41, { offer: filters.offer, pairId });
  return { ad, used: nextUsed };
}

export const FILTER_FORMATS = [{ id: "all" as const, label: "All formats" }, ...FORMATS];
export const FILTER_PERSONAS = [{ id: "all" as const, label: "All personas" }, ...PERSONAS];
export const FILTER_PLATFORMS = [{ id: "all" as const, label: "All platforms" }, ...PLATFORMS];
export const FILTER_DURATIONS = [
  { id: "all" as const, label: "Any length" },
  { id: 15 as const, label: "15s" },
  { id: 30 as const, label: "30s" },
  { id: 45 as const, label: "45s" },
];
