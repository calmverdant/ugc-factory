import { HOOK_BY_ID } from "./catalog";
import { decorateAd } from "./craft";
import { mintAd } from "./mint";
import { comboKey, mulberry32, pick } from "./rng";
import type { MintedAd, ProductBrief } from "./types";
import { FATIGUE_DAYS, HOOK_IDS } from "./types";

export type PerfRow = {
  number?: number;
  hook?: string;
  ctr?: string;
  cpa?: string;
  thumbStop?: string;
};

function headerIndex(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""));
  for (const alias of aliases) {
    const i = lower.indexOf(alias);
    if (i >= 0) return i;
  }
  return -1;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Ads Manager or UGC Factory CSV. Maps CTR / CPA / thumb-stop onto minted ads. */
export function parsePerformanceCsv(text: string): PerfRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!);
  const numI = headerIndex(headers, ["adnumber", "ad_number", "adname", "name"]);
  const hookI = headerIndex(headers, ["hook", "headline", "primarytext"]);
  const ctrI = headerIndex(headers, ["ctr", "ctrall", "outboundctr"]);
  const cpaI = headerIndex(headers, ["cpa", "costperresult", "costperaction"]);
  const stopI = headerIndex(headers, [
    "thumbstop",
    "thrumstop",
    "threesecondvideo",
    "video3sec",
    "holdrate",
    "thumb_stop",
  ]);
  const rows: PerfRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const name = numI >= 0 ? cols[numI] ?? "" : "";
    const numMatch = name.match(/(\d{1,4})/);
    rows.push({
      number: numMatch ? Number(numMatch[1]) : undefined,
      hook: hookI >= 0 ? cols[hookI] : undefined,
      ctr: ctrI >= 0 ? cols[ctrI]?.trim() : undefined,
      cpa: cpaI >= 0 ? cols[cpaI]?.trim() : undefined,
      thumbStop: stopI >= 0 ? cols[stopI]?.trim() : undefined,
    });
  }
  return rows.filter((row) => row.ctr || row.cpa || row.thumbStop);
}

export function applyPerformance(ads: MintedAd[], rows: PerfRow[]): {
  ads: MintedAd[];
  matched: number;
} {
  let matched = 0;
  const next = ads.map((ad) => {
    const row =
      rows.find((item) => item.number === ad.number) ??
      rows.find(
        (item) =>
          item.hook &&
          ad.hook.toLowerCase().includes(item.hook.slice(0, 18).toLowerCase()),
      );
    if (!row) return ad;
    matched += 1;
    return {
      ...ad,
      ctr: row.ctr || ad.ctr,
      cpa: row.cpa || ad.cpa,
      thumbStop: row.thumbStop || ad.thumbStop,
      liveAt: ad.liveAt ?? Date.now(),
    };
  });
  return { ads: next, matched };
}

export function recordAbWinner(ads: MintedAd[], winner: MintedAd): MintedAd[] {
  const pairId = winner.pairId ?? winner.id;
  return ads.map((item) => {
    const inPair =
      item.id === winner.id ||
      item.pairId === pairId ||
      item.id === pairId;
    if (!inPair) return item;
    if (item.id === winner.id) {
      return { ...item, winner: true, pairId, liveAt: item.liveAt ?? Date.now() };
    }
    const losses = (item.abLosses ?? 0) + 1;
    return {
      ...item,
      winner: false,
      pairId,
      abLosses: losses,
      killed: losses >= 2 ? true : item.killed,
    };
  });
}

export function fatigueDays(ad: MintedAd, now = Date.now()): number {
  const start = ad.liveAt ?? ad.mintedAt;
  if (!start) return 0;
  return Math.floor((now - start) / 86_400_000);
}

export function isFatigued(ad: MintedAd, now = Date.now()): boolean {
  if (!ad.pinned && !ad.liveAt) return false;
  return fatigueDays(ad, now) >= FATIGUE_DAYS;
}

export function fatigueNote(ad: MintedAd): string | null {
  if (!isFatigued(ad)) return null;
  const days = fatigueDays(ad);
  return `This hook has been live ${days} days — mint a new open`;
}

export function applyOpen(ad: MintedAd, hook: string, brief: ProductBrief): MintedAd {
  const beats = ad.beats.map((beat, i) => (i === 0 ? { ...beat, line: hook } : beat));
  const ost = [hook, ...ad.onScreenText.filter((line) => line !== ad.hook)].slice(0, 4);
  return decorateAd(
    {
      ...ad,
      hook,
      beats,
      onScreenText: ost,
      metaPrimary: `${hook} ${ad.metaPrimary.replace(ad.hook, "").trim()}`,
    },
    brief,
  );
}

export function mintOpens(
  brief: ProductBrief,
  source: MintedAd,
  used: Set<string>,
  seed: number,
): { ads: MintedAd[]; used: Set<string> } {
  const rng = mulberry32(seed);
  const pool = HOOK_IDS.filter((id) => id !== source.combo.hook);
  const nextUsed = new Set(used);
  const ads: MintedAd[] = [];
  const group = source.openGroupId ?? source.id;
  for (let i = 0; i < 3 && pool.length; i++) {
    const hookId = pick(rng, pool);
    const idx = pool.indexOf(hookId);
    if (idx >= 0) pool.splice(idx, 1);
    const combo = { ...source.combo, hook: hookId };
    const key = comboKey(combo);
    if (nextUsed.has(key)) continue;
    nextUsed.add(key);
    const minted = mintAd(brief, combo, seed + i * 17 + 3, {
      offer: source.offer,
      pairId: group,
      openGroupId: group,
      angle: source.angle,
      sku: source.sku,
    });
    const body = source.beats.slice(1);
    ads.push(
      decorateAd(
        {
          ...minted,
          beats: minted.beats.map((beat, n) =>
            n === 0 ? beat : body[n - 1] ? { ...beat, line: body[n - 1]!.line } : beat,
          ),
          openGroupId: group,
          pairId: group,
        },
        brief,
      ),
    );
  }
  return { ads, used: nextUsed };
}

export function altHookLines(ad: MintedAd, brief: ProductBrief, seed: number): string[] {
  const rng = mulberry32(seed + ad.number * 13);
  const others = HOOK_IDS.filter((id) => id !== ad.combo.hook);
  const out: string[] = [];
  for (let i = 0; i < 3 && others.length; i++) {
    const id = pick(rng, others);
    const idx = others.indexOf(id);
    if (idx >= 0) others.splice(idx, 1);
    const line = pick(rng, HOOK_BY_ID[id].lines)
      .replaceAll("{name}", brief.name)
      .replaceAll("{price}", brief.price)
      .replaceAll("{problem}", brief.problem)
      .replaceAll("{category}", brief.category)
      .replaceAll("{claim}", brief.claims[0] ?? brief.oneLiner)
      .replaceAll("{outcome}", brief.outcome)
      .replace(/\s+/g, " ")
      .trim();
    out.push(line);
  }
  return out;
}
