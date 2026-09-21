import { decorateAd } from "./craft";
import type {
  Creator,
  DropSlot,
  FactoryFilters,
  MintedAd,
  ProductBrief,
  ProductPack,
} from "./types";
import { DEFAULT_USAGE } from "./types";

const KEY = "ugc-factory-v2";
const LEGACY = "ugc-factory-v1";
const VIDEO_DAY_KEY = "ugc-factory-video-day";
const CAL_KEY = "ugc-factory-calendar";
const RESUME_KEY = "ugc-factory-resume";
const VIDEO_DAY_MAX = 6;

export type StoredFactory = {
  query: string;
  brief: ProductBrief | null;
  ads: MintedAd[];
  used: string[];
  filters: FactoryFilters;
  packs: ProductPack[];
  creators: Creator[];
  activeCreatorId: string | null;
};

export const EMPTY_FILTERS: FactoryFilters = {
  format: "all",
  persona: "all",
  platform: "all",
  duration: "all",
  offer: "none",
  view: "all",
  desk: "shelf",
};

function normalizeFilters(raw: Partial<FactoryFilters> | undefined): FactoryFilters {
  const desk = raw?.desk;
  const allowed = new Set(["shelf", "matrix", "ab", "opens", "calendar", "kit", "alpha"]);
  return {
    ...EMPTY_FILTERS,
    ...raw,
    offer: raw?.offer ?? "none",
    view: raw?.view ?? "all",
    desk: desk && allowed.has(desk) ? desk : "shelf",
  };
}

function normalizeCreator(creator: Creator): Creator {
  return {
    ...creator,
    rights: creator.rights ?? "Paid usage. Face and voice.",
    rate: creator.rate ?? "",
    usageWindow: creator.usageWindow ?? DEFAULT_USAGE,
    organicRate: creator.organicRate ?? creator.rate ?? "",
    paidRate: creator.paidRate ?? "",
  };
}

function normalizeAd(ad: MintedAd, brief: ProductBrief | null): MintedAd {
  const next: MintedAd = {
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
    shotClips: ad.shotClips,
  };
  return brief ? decorateAd(next, brief) : next;
}

export function loadFactory(): StoredFactory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFactory>;
    if (!parsed || typeof parsed !== "object") return null;
    const brief = parsed.brief ?? null;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      brief,
      ads: Array.isArray(parsed.ads)
        ? parsed.ads.slice(-96).map((ad) => normalizeAd(ad, brief))
        : [],
      used: Array.isArray(parsed.used) ? parsed.used.slice(-4000) : [],
      filters: normalizeFilters(parsed.filters),
      packs: Array.isArray(parsed.packs) ? parsed.packs.slice(-24) : [],
      creators: Array.isArray(parsed.creators)
        ? parsed.creators.slice(-24).map(normalizeCreator)
        : [],
      activeCreatorId: parsed.activeCreatorId ?? null,
    };
  } catch {
    return null;
  }
}

export function saveFactory(state: StoredFactory) {
  if (typeof window === "undefined") return;
  try {
    const ads = state.ads.slice(-96).map((ad) => ({
      ...ad,
      stillUrl: ad.stillUrl && ad.stillUrl.startsWith("data:") ? undefined : ad.stillUrl,
      videoUrl: ad.videoUrl && ad.videoUrl.startsWith("data:") ? undefined : ad.videoUrl,
      voiceUrl: ad.voiceUrl && ad.voiceUrl.startsWith("data:") ? undefined : ad.voiceUrl,
      webcamUrl:
        ad.webcamUrl && ad.webcamUrl.startsWith("blob:") ? undefined : ad.webcamUrl,
      burnedCaptionUrl: undefined,
      bundleUrl: undefined,
      thumb9x16: ad.thumb9x16?.startsWith("data:") ? undefined : ad.thumb9x16,
      thumb1x1: ad.thumb1x1?.startsWith("data:") ? undefined : ad.thumb1x1,
    }));
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        ...state,
        ads,
        used: state.used.slice(-4000),
        packs: state.packs.slice(-24),
        creators: state.creators.slice(-24),
      }),
    );
  } catch {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({
          ...state,
          ads: state.ads.slice(-48).map((ad) => ({
            ...ad,
            stillUrl: undefined,
            videoUrl: undefined,
            webcamUrl: undefined,
          })),
          packs: state.packs.slice(-8),
        }),
      );
    } catch {
      // ignore
    }
  }
}

export type ResumeState = {
  query: string;
  brief: ProductBrief;
  ads: MintedAd[];
  used: string[];
  filters: FactoryFilters;
};

export function loadResume(): ResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResumeState>;
    if (!parsed?.brief || typeof parsed.brief !== "object") return null;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      brief: parsed.brief,
      ads: Array.isArray(parsed.ads)
        ? parsed.ads.slice(-96).map((ad) => normalizeAd(ad, parsed.brief ?? null))
        : [],
      used: Array.isArray(parsed.used) ? parsed.used.slice(-4000) : [],
      filters: normalizeFilters(parsed.filters),
    };
  } catch {
    return null;
  }
}

export function saveResume(state: ResumeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        query: state.query,
        brief: state.brief,
        ads: state.ads.slice(-96).map((ad) => ({
          ...ad,
          stillUrl: ad.stillUrl?.startsWith("data:") ? undefined : ad.stillUrl,
          videoUrl: ad.videoUrl?.startsWith("data:") ? undefined : ad.videoUrl,
          voiceUrl: ad.voiceUrl?.startsWith("data:") ? undefined : ad.voiceUrl,
          webcamUrl: undefined,
          burnedCaptionUrl: undefined,
          bundleUrl: undefined,
        })),
        used: state.used.slice(-4000),
        filters: state.filters,
      }),
    );
  } catch {
    try {
      window.localStorage.setItem(
        RESUME_KEY,
        JSON.stringify({
          query: state.query,
          brief: state.brief,
          ads: [],
          used: [],
          filters: state.filters,
        }),
      );
    } catch {
      // ignore
    }
  }
}

export function clearResume() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}

export function loadCalendar(): DropSlot[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DropSlot[];
    return Array.isArray(parsed) ? parsed.slice(0, 7) : null;
  } catch {
    return null;
  }
}

export function saveCalendar(slots: DropSlot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAL_KEY, JSON.stringify(slots.slice(0, 7)));
  } catch {
    // ignore
  }
}

export function clearCurrent() {
  // Keep library, kit, winners, roster; current workspace is cleared by the caller.
}

type VideoDay = { day: string; n: number };

function readVideoDay(): VideoDay {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = window.localStorage.getItem(VIDEO_DAY_KEY);
    if (!raw) return { day: today, n: 0 };
    const parsed = JSON.parse(raw) as Partial<VideoDay>;
    if (parsed.day !== today) return { day: today, n: 0 };
    return { day: today, n: Math.max(0, Number(parsed.n) || 0) };
  } catch {
    return { day: today, n: 0 };
  }
}

export function videoSlotsLeft(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, VIDEO_DAY_MAX - readVideoDay().n);
}

export function takeVideoSlot():
  | { ok: true; left: number }
  | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Video is unavailable." };
  }
  const current = readVideoDay();
  if (current.n >= VIDEO_DAY_MAX) {
    return {
      ok: false,
      error: `Daily clip limit reached (${VIDEO_DAY_MAX}). Try again tomorrow.`,
    };
  }
  try {
    window.localStorage.setItem(
      VIDEO_DAY_KEY,
      JSON.stringify({ day: current.day, n: current.n + 1 }),
    );
  } catch {
    // still allow the generation
  }
  return { ok: true, left: VIDEO_DAY_MAX - current.n - 1 };
}

export function refundVideoSlot() {
  if (typeof window === "undefined") return;
  const current = readVideoDay();
  try {
    window.localStorage.setItem(
      VIDEO_DAY_KEY,
      JSON.stringify({ day: current.day, n: Math.max(0, current.n - 1) }),
    );
  } catch {
    // ignore
  }
}

export { VIDEO_DAY_MAX };
