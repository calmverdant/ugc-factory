import { peekKit } from "./kit";
import { checkPolicy } from "./policy";
import type {
  BrandKit,
  ClaimReport,
  FieldLint,
  HookScore,
  MintedAd,
  OfferId,
  PlatformId,
  ProductBrief,
} from "./types";
import { isEnglishish } from "./english";
import { offerLine } from "./offers";

export const PLATFORM_LIMITS: Record<
  PlatformId,
  { caption: number; meta: number; hookWords: number; ost: number }
> = {
  tiktok: { caption: 150, meta: 125, hookWords: 14, ost: 42 },
  reels: { caption: 125, meta: 125, hookWords: 14, ost: 42 },
  shorts: { caption: 100, meta: 125, hookWords: 16, ost: 40 },
  meta: { caption: 125, meta: 125, hookWords: 16, ost: 42 },
  pinterest: { caption: 500, meta: 160, hookWords: 16, ost: 48 },
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function harvestNumbers(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

export function scoreHook(ad: MintedAd, brief: ProductBrief): HookScore {
  const reasons: string[] = [];
  let value = 58;
  const interrupt = /^(stop|wait|don't|dont|hold|if you|please do not|watch this)/i;
  const hedge = /\b(maybe|kind of|sort of|i guess|vibes)\b/i;
  const strong = new Set([
    "stop-scroll",
    "dont-buy",
    "wait-actually",
    "almost-returned",
  ]);
  const solid = new Set([
    "skeptical",
    "didnt-expect",
    "what-price-gets",
    "three-things",
    "if-you-struggle",
  ]);

  if (interrupt.test(ad.hook)) {
    value += 10;
    reasons.push("Pattern interrupt in the first words");
  } else if (strong.has(ad.combo.hook)) {
    value += 8;
    reasons.push("Interrupt hook family");
  } else if (solid.has(ad.combo.hook)) {
    value += 5;
    reasons.push("Curiosity or proof family");
  }

  const words = wordCount(ad.hook);
  if (words >= 8 && words <= 16) {
    value += 8;
    reasons.push("Hold length — 8 to 16 spoken words");
  } else if (words > 22) {
    value -= 12;
    reasons.push("Hook overruns the first 3 seconds");
  } else if (words < 5) {
    value -= 6;
    reasons.push("Hook is too thin to hold");
  }

  if (/\d/.test(ad.hook)) {
    value += 8;
    reasons.push("Specific number in the open");
  }
  if (brief.price && ad.hook.includes(brief.price)) {
    value += 4;
    reasons.push("Price is on the hook");
  }

  const locker = [brief.price, ...brief.claims, ...brief.proof].join(" ").toLowerCase();
  if (brief.claims.some((claim) => ad.hook.toLowerCase().includes(claim.slice(0, 18).toLowerCase()))) {
    value += 6;
    reasons.push("Claim language in the open");
  } else if (harvestNumbers(ad.hook).some((n) => locker.includes(n))) {
    value += 4;
    reasons.push("Locker number in the open");
  }

  if (hedge.test(ad.hook)) {
    value -= 6;
    reasons.push("Hedge words soften the hold");
  }
  if (ad.winner) {
    value += 4;
    reasons.push("This family already won an A/B");
  }
  if (ad.angle === "proof" && brief.stars) {
    value += 3;
    reasons.push("Proof angle with stars in the locker");
  }

  value = Math.max(32, Math.min(96, value));
  const label: HookScore["label"] =
    value >= 80 ? "Strong" : value >= 68 ? "Solid" : "Soft";
  return { value, label, reasons: reasons.slice(0, 4) };
}

export function checkClaims(ad: MintedAd, brief: ProductBrief): ClaimReport {
  const allowed = new Set(
    harvestNumbers(
      [
        brief.price,
        brief.oneLiner,
        brief.unit,
        brief.size,
        brief.stars,
        ...(brief.claims ?? []),
        ...(brief.proof ?? []),
        ...(brief.ingredients ?? []),
        ...(brief.skus ?? []),
        ...(brief.claimSources ?? []).map((item) => item.source),
      ].join(" "),
    ),
  );
  const spoken = [
    ad.hook,
    ad.caption,
    ad.metaPrimary,
    ...ad.beats.map((beat) => beat.line),
  ].join(" ");
  const flags: string[] = [];
  for (const num of new Set(harvestNumbers(spoken))) {
    if (!allowed.has(num) && num !== String(ad.combo.duration)) {
      flags.push(`${num} is not in the claims locker`);
    }
  }
  return { ok: flags.length === 0, flags: flags.slice(0, 4) };
}

export function lintAd(ad: MintedAd): FieldLint[] {
  const limits = PLATFORM_LIMITS[ad.combo.platform];
  const caption = ad.caption.length;
  const meta = ad.metaPrimary.length;
  const hookWords = wordCount(ad.hook);
  const ost = Math.max(0, ...ad.onScreenText.map((line) => line.length));
  const spoken = [ad.hook, ad.caption, ...ad.beats.map((beat) => beat.line)].join(" ");
  const englishOk = isEnglishish(spoken);
  const policyOk = ad.policy?.ok !== false;
  const legalOk = ad.legalStamp !== "block";
  return [
    {
      field: "Caption",
      chars: caption,
      limit: limits.caption,
      ok: caption <= limits.caption,
      hint: `${caption}/${limits.caption} recommended for ${ad.platformLabel}`,
    },
    {
      field: "Meta primary",
      chars: meta,
      limit: limits.meta,
      ok: meta <= limits.meta,
      hint: `${meta}/${limits.meta} before the fold on feed`,
    },
    {
      field: "Hook",
      chars: hookWords,
      limit: limits.hookWords,
      ok: hookWords <= limits.hookWords,
      hint: `${hookWords}/${limits.hookWords} words for a 3s open`,
    },
    {
      field: "On-screen line",
      chars: ost,
      limit: limits.ost,
      ok: ost <= limits.ost,
      hint: `${ost}/${limits.ost} characters per line`,
    },
    {
      field: "English",
      chars: spoken.length,
      limit: spoken.length,
      ok: englishOk,
      hint: englishOk
        ? "Global English"
        : "Non-English script in the copy — rewrite in English",
    },
    {
      field: "Policy",
      chars: ad.policy?.flags.length ?? 0,
      limit: 0,
      ok: policyOk,
      hint: policyOk
        ? "No blocking policy flags"
        : (ad.policy?.flags.find((f) => f.severity === "block")?.label ?? "Policy"),
    },
    {
      field: "Legal",
      chars: ad.legalStamp === "signed-off" ? 0 : ad.legalStamp === "block" ? 1 : 0,
      limit: 0,
      ok: legalOk,
      hint:
        ad.legalStamp === "signed-off"
          ? "Signed off"
          : ad.legalStamp === "block"
            ? "Blocked — legal queue"
            : "Clear",
    },
  ];
}

export function decorateAd(
  ad: MintedAd,
  brief: ProductBrief,
  kit?: BrandKit,
): MintedAd {
  const active = kit ?? peekKit();
  const scored: MintedAd = {
    ...ad,
    pinned: ad.pinned ?? false,
    hidden: ad.hidden ?? false,
    note: ad.note ?? "",
    offer: ad.offer ?? "none",
    ctr: ad.ctr ?? "",
    cpa: ad.cpa ?? "",
    thumbStop: ad.thumbStop ?? "",
    winner: ad.winner ?? false,
    killed: ad.killed ?? false,
    mintedAt: ad.mintedAt ?? Date.now(),
    abLosses: ad.abLosses ?? 0,
    legalStamp: ad.legalStamp ?? "none",
    sparkCode: ad.sparkCode ?? "",
    utm: ad.utm ?? "",
    altHooks: ad.altHooks ?? [],
  };
  scored.hookScore = scoreHook(scored, brief);
  scored.claims = checkClaims(scored, brief);
  scored.policy = checkPolicy(scored, brief, active);
  if (scored.policy.flags.some((flag) => flag.severity === "block") && scored.legalStamp !== "signed-off") {
    scored.legalStamp = scored.legalStamp === "none" ? "block" : scored.legalStamp;
  }
  return scored;
}

export function visibleAds(
  ads: MintedAd[],
  view: "all" | "keepers" | "hidden" | "ab",
): MintedAd[] {
  if (view === "keepers") return ads.filter((ad) => ad.pinned && !ad.hidden && !ad.killed);
  if (view === "hidden") return ads.filter((ad) => ad.hidden || ad.killed);
  if (view === "ab") return ads.filter((ad) => ad.pairId && !ad.hidden && !ad.killed);
  return ads.filter((ad) => !ad.hidden && !ad.killed);
}

export function exportAds(ads: MintedAd[]): MintedAd[] {
  const keepers = ads.filter(
    (ad) => ad.pinned && !ad.hidden && !ad.killed && ad.legalStamp !== "block",
  );
  if (keepers.length) return keepers;
  return ads.filter((ad) => !ad.hidden && !ad.killed && ad.legalStamp !== "block");
}

export function findPair(ads: MintedAd[], ad: MintedAd): MintedAd | null {
  if (!ad.pairId) return null;
  return (
    ads.find(
      (item) =>
        item.id !== ad.id &&
        (item.id === ad.pairId || item.pairId === ad.pairId),
    ) ?? null
  );
}

const OFFER_STRIP =
  /\s*(This is launch week|Show the set together|Put the live price|Gift energy|Daylight, travel|Weekday morning|Prime Day|Black Friday)[\s\S]*$/i;

export function applyOfferToAd(
  ad: MintedAd,
  brief: ProductBrief,
  offer: OfferId,
): MintedAd {
  const line = offerLine(offer);
  const beats = ad.beats.map((beat, i) => {
    if (i !== ad.beats.length - 1) return beat;
    const stripped = beat.line.replace(OFFER_STRIP, "").trim();
    return { ...beat, line: line ? `${stripped} ${line}`.trim() : stripped };
  });
  let ost = ad.onScreenText.filter((item) => item !== brief.price);
  if ((offer === "flash" || offer === "launch" || offer === "prime" || offer === "bfcm") && brief.price) {
    ost = [...ost, brief.price].slice(0, 4);
  }
  let caption = ad.caption;
  const previous = offerLine(ad.offer ?? "none");
  if (previous) caption = caption.replace(previous, "").trim();
  if (line && !caption.includes(line)) caption = `${caption}\n${line}`.trim();
  return decorateAd({ ...ad, beats, onScreenText: ost, caption, offer }, brief);
}

export function applyOfferToAds(
  ads: MintedAd[],
  brief: ProductBrief,
  offer: OfferId,
): MintedAd[] {
  return ads.map((ad) => applyOfferToAd(ad, brief, offer));
}

export function echoVoice(caption: string, samples: string[] | undefined): string {
  const sample = samples?.find((item) => item.trim())?.trim();
  if (!sample) return caption;
  const lower = sample === sample.toLowerCase();
  if (lower) return caption.toLowerCase();
  return caption;
}
