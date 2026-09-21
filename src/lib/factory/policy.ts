import { peekKit } from "./kit";
import type {
  BrandKit,
  MintedAd,
  PlatformId,
  PolicyFlag,
  PolicyReport,
  ProductBrief,
} from "./types";

const HEALTH = /\b(cure|cures|treat|treats|heal|heals|diagnose|prevent disease|clinically proven to (cure|treat))\b/i;
const INCOME = /\b(guaranteed (income|profit|results)|get rich|passive income overnight|make \$\d+ (a|per) day)\b/i;
const GUARANTEE = /\b(guaranteed|100% (works|effective)|miracle|risk[- ]free forever)\b/i;
const BEFORE_AFTER = /\b(before (and|&) after|day \d+|in \d+ days?|results in)\b/i;
const RESULTS_DAYS = /\b(?:in|within)\s+(\d+)\s+days?\b/i;
const DARK = /\b(only \d+ left|hurry|last chance|limited time|countdown|act now|selling out|fake timer)\b/i;
const MOCK = /\b(trash|garbage|scam|ripoff|rip-off|stupid|dumb|garbage brand)\b/i;

export function lockerText(brief: ProductBrief): string {
  return [
    brief.price,
    brief.oneLiner,
    brief.unit,
    brief.size,
    brief.boxContents,
    brief.stars,
    brief.tastesLike,
    ...(brief.claims ?? []),
    ...(brief.proof ?? []),
    ...(brief.ingredients ?? []),
    ...(brief.skus ?? []),
    ...(brief.claimSources ?? []).map((item) => item.source),
  ]
    .filter(Boolean)
    .join(" ");
}

export function checkPolicy(
  ad: MintedAd,
  brief: ProductBrief,
  kit: BrandKit = peekKit(),
): PolicyReport {
  const spoken = [
    ad.hook,
    ad.caption,
    ad.metaPrimary,
    ...ad.beats.map((beat) => beat.line),
    ...ad.onScreenText,
  ].join(" ");
  const flags: PolicyFlag[] = [];
  const platform: PlatformId = ad.combo.platform;

  if (HEALTH.test(spoken)) {
    flags.push({
      id: "health",
      severity: "block",
      label: "Health claim",
      detail: "Copy reads like a medical claim. Keep it to how it feels, not what it treats.",
    });
  }
  if (INCOME.test(spoken)) {
    flags.push({
      id: "income",
      severity: "block",
      label: "Income claim",
      detail: "Guaranteed income language fails Meta and YouTube policy.",
    });
  }
  if (GUARANTEE.test(spoken)) {
    flags.push({
      id: "guarantee",
      severity: platform === "meta" || platform === "shorts" ? "block" : "warn",
      label: "Absolute guarantee",
      detail: "“Guaranteed / 100% / miracle” is a typical takedown on paid social.",
    });
  }
  if (ad.combo.format === "before-after" || BEFORE_AFTER.test(spoken)) {
    flags.push({
      id: "before-after",
      severity: "warn",
      label: "Before / after",
      detail: "Show the same lighting and no weight or medical implication. Disclose typical results.",
    });
  }
  const days = spoken.match(RESULTS_DAYS);
  if (days) {
    const n = days[1] ?? "";
    const allowed = lockerText(brief);
    if (!allowed.includes(n)) {
      flags.push({
        id: "results-days",
        severity: "block",
        label: "Results in N days",
        detail: `${n} days is not in the claims locker. Drop the timeline or add it to the brief from the page.`,
      });
    } else {
      flags.push({
        id: "results-days",
        severity: "warn",
        label: "Results timeline",
        detail: `Timeline “${n} days” is in the locker — still say it was a survey or typical, not a promise.`,
      });
    }
  }

  if (DARK.test(spoken) && ad.offer !== "flash" && ad.offer !== "prime" && ad.offer !== "bfcm") {
    flags.push({
      id: "dark-pattern",
      severity: "block",
      label: "Dark pattern",
      detail: "Fake countdown, “only N left,” or invented urgency. Drop it or use a real offer window.",
    });
  } else if (DARK.test(spoken)) {
    flags.push({
      id: "dark-pattern",
      severity: "warn",
      label: "Urgency",
      detail: "Season offer is on — still no fake stock count or countdown clock.",
    });
  }

  for (const word of kit.banned) {
    if (word.length < 2) continue;
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(spoken)) {
      flags.push({
        id: `banned-${word.slice(0, 12)}`,
        severity: "block",
        label: "Banned word",
        detail: `“${word}” is on the brand kit banned list.`,
      });
    }
  }

  const rival = brief.competitor?.trim();
  if (rival) {
    const named = new RegExp(rival.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(spoken);
    if (kit.competitorRule === "category-only" && named) {
      flags.push({
        id: "competitor-name",
        severity: "warn",
        label: "Competitor named",
        detail: `Kit is category-only. Swap “${rival}” for “the usual ${brief.category}”.`,
      });
    }
    if (kit.competitorRule === "dont-mock" && named && MOCK.test(spoken)) {
      flags.push({
        id: "competitor-mock",
        severity: "block",
        label: "Competitor mock",
        detail: "Name them if you must. Do not mock them.",
      });
    }
  }

  const blocking = flags.some((flag) => flag.severity === "block");
  const signed = ad.legalStamp === "signed-off";
  return {
    ok: !blocking || signed,
    flags: flags.slice(0, 8),
  };
}

export const CALL_SHEET_CHECKS = [
  "No copyrighted music unless cleared. Use the licensed-safe bed or silence.",
  "Creator is 18+. No minors in frame.",
  "Face and voice: usage matches the roster window.",
  "Product pack copy in English if readable.",
  "Captions on for sound-off. Safe zone: 9:16 lower fifth clear of UI.",
  "No fake engagement, no unapproved health claims, no dark-pattern countdown.",
  "Numbers match the claims locker. Legal stamp signed-off if a block flag fired.",
];
