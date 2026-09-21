import { offerLabel } from "./offers";
import type {
  Creator,
  DropSlot,
  MintedAd,
  OfferId,
  PlatformId,
  ProductBrief,
} from "./types";
import { DEFAULT_USAGE, PLATFORM_IDS } from "./types";

function money(raw: string | undefined): number {
  const n = Number.parseFloat((raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function windowDays(usage: string | undefined): number {
  const match = (usage ?? DEFAULT_USAGE).match(/(\d+)\s+days?/i);
  return match ? Number(match[1]) : 30;
}

export type RateCard = {
  organic: number;
  paid: number;
  platforms: number;
  days: number;
  line: string;
};

export function rateCard(creator: Creator, platforms: number): RateCard {
  const days = windowDays(creator.usageWindow);
  const organicBase = money(creator.organicRate) || money(creator.rate) || 0;
  const paidBase = money(creator.paidRate) || (organicBase ? organicBase * 1.5 : 0);
  const scale = Math.max(1, platforms) * (days / 30);
  const organic = Math.round(organicBase * scale);
  const paid = Math.round(paidBase * scale);
  const line = organic
    ? `Organic $${organic} · paid $${paid} · ${platforms} platform${platforms === 1 ? "" : "s"} · ${days}-day window`
    : `Rate TBD · ${platforms} platform${platforms === 1 ? "" : "s"} · ${days}-day window`;
  return { organic, paid, platforms, days, line };
}

export function shotLoad(ad: MintedAd): { shots: number; minutes: number; line: string } {
  const shots = Math.max(ad.shotList.length, ad.shotClips?.length ?? 0, 1);
  const minutes = 20 + shots * 8;
  const hours = minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${minutes} min`;
  return {
    shots,
    minutes,
    line: `${shots} shots · ~${hours} on set (setup + takes, one wardrobe)`,
  };
}

export function autoAssign(ad: MintedAd, creators: Creator[]): MintedAd {
  if (ad.assignedCreatorId) return ad;
  const match = creators.find((item) => item.persona === ad.combo.persona);
  if (!match) return ad;
  return { ...ad, assignedCreatorId: match.id };
}

export function autoAssignAds(ads: MintedAd[], creators: Creator[]): MintedAd[] {
  return ads.map((ad) => autoAssign(ad, creators));
}

export function emptyCalendar(offer: OfferId = "none"): DropSlot[] {
  const platforms: PlatformId[] = ["tiktok", "reels", "shorts", "meta", "tiktok", "reels", "shorts"];
  return platforms.map((platform, day) => ({
    day,
    adId: null,
    platform,
    offer,
  }));
}

export function fillCalendar(ads: MintedAd[], offer: OfferId): DropSlot[] {
  const keepers = ads.filter((ad) => ad.pinned && !ad.hidden && !ad.killed);
  const pool = keepers.length ? keepers : ads.filter((ad) => !ad.hidden && !ad.killed);
  const slots = emptyCalendar(offer);
  return slots.map((slot, i) => {
    const ad = pool[i % Math.max(pool.length, 1)];
    if (!ad || !pool.length) return slot;
    return {
      ...slot,
      adId: ad.id,
      platform: ad.combo.platform,
      offer: ad.offer ?? offer,
    };
  });
}

export function utmFor(brief: ProductBrief, ad: MintedAd): string {
  if (ad.utm?.trim()) return ad.utm.trim();
  const slug = brief.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const base = brief.url ?? "https://example.com";
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}utm_source=ugc-factory&utm_medium=${ad.combo.platform}&utm_campaign=${slug}&utm_content=ad-${String(ad.number).padStart(4, "0")}`;
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function talentBriefHtml(
  brief: ProductBrief,
  ad: MintedAd,
  creator?: Creator | null,
): string {
  const load = shotLoad(ad);
  const card = creator ? rateCard(creator, 1) : null;
  const still = ad.stillUrl
    ? `<img src="${escapeHtml(ad.stillUrl)}" alt="" style="width:160px;height:220px;object-fit:cover"/>`
    : "";
  const script = ad.beats
    .map(
      (beat) =>
        `<p><span class="t">${beat.start}–${beat.end}s · ${escapeHtml(beat.label)}</span><br/>${escapeHtml(beat.line)}</p>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Talent brief — ${escapeHtml(brief.name)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a1916; background: #f3efe6; margin: 32px; max-width: 640px; }
    h1 { font-size: 26px; margin: 0 0 6px; }
    .t, .meta { font-family: ui-monospace, monospace; font-size: 12px; color: #5c5850; }
    .hook { font-style: italic; font-size: 20px; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <p class="meta">Talent brief · English · Global · ${escapeHtml(ad.platformLabel)}</p>
  <h1>${escapeHtml(brief.name)}</h1>
  <p class="hook">${escapeHtml(ad.hook)}</p>
  <p class="meta">${escapeHtml(ad.formatLabel)} · ${escapeHtml(ad.personaLabel)} · ${ad.combo.duration}s · ${escapeHtml(offerLabel(ad.offer ?? "none"))}</p>
  ${still}
  <h3>Wardrobe / setting</h3>
  <p>${escapeHtml(brief.wardrobe)}. ${escapeHtml(brief.setting)}.</p>
  <p class="meta">${escapeHtml(load.line)}</p>
  ${
    creator
      ? `<p>${escapeHtml(creator.name)} · ${escapeHtml(creator.rights || "paid usage")} · ${escapeHtml(card?.line || creator.rate || "rate TBD")}</p>`
      : ""
  }
  <h3>Script — open teleprompter on set</h3>
  ${script}
  <p class="meta">Locked still above is the first frame. Captions stay English for hard-of-hearing. Usage: ${escapeHtml(creator?.usageWindow || DEFAULT_USAGE)}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

export { PLATFORM_IDS };
