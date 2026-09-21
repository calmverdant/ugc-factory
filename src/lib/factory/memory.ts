import type { MintedAd, ProductBrief, WinnerMemory } from "./types";

const KEY = "ugc-factory-winners";

let cache: WinnerMemory[] | null = null;

export function loadWinners(): WinnerMemory[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = [];
      return cache;
    }
    const parsed = JSON.parse(raw) as WinnerMemory[];
    cache = Array.isArray(parsed) ? parsed.slice(0, 48) : [];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

export function saveWinners(list: WinnerMemory[]) {
  cache = list.slice(0, 48);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function rememberWinner(brief: ProductBrief, ad: MintedAd): WinnerMemory[] {
  const next: WinnerMemory = {
    id: `${ad.combo.hook}-${ad.combo.format}-${Date.now()}`,
    product: brief.name,
    brand: brief.brand,
    hookFamily: ad.combo.hook,
    format: ad.combo.format,
    persona: ad.combo.persona,
    platform: ad.combo.platform,
    hook: ad.hook,
    score: ad.hookScore?.value ?? 0,
    savedAt: Date.now(),
  };
  const list = [
    next,
    ...loadWinners().filter(
      (item) =>
        !(
          item.hookFamily === next.hookFamily &&
          item.format === next.format &&
          item.product === next.product
        ),
    ),
  ].slice(0, 48);
  saveWinners(list);
  return list;
}

export function forgetWinner(id: string): WinnerMemory[] {
  const list = loadWinners().filter((item) => item.id !== id);
  saveWinners(list);
  return list;
}

export function suggestWinners(brief: ProductBrief, list: WinnerMemory[]): WinnerMemory[] {
  return list
    .filter((item) => item.product !== brief.name)
    .slice(0, 8);
}
