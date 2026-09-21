export const FORMAT_IDS = [
  "problem-solution",
  "unboxing",
  "day-in-life",
  "testimonial",
  "before-after",
  "grwm",
  "myth-bust",
  "listicle",
  "pov",
  "green-screen",
  "walk-and-talk",
  "silent-text",
  "street-interview",
  "howto",
  "wish-i-knew",
  "comparison",
] as const;

export const HOOK_IDS = [
  "stop-scroll",
  "didnt-expect",
  "mistake",
  "unpopular",
  "three-things",
  "pov",
  "wait-actually",
  "dont-buy",
  "skeptical",
  "made-me",
  "what-price-gets",
  "if-you-struggle",
  "switched",
  "nobody-talks",
  "day-n",
  "ranking",
  "honest-review",
  "before-checkout",
  "almost-returned",
  "overheard",
  "red-flag",
  "receipt",
  "two-am",
  "my-people",
  "quiet-part",
  "last-one",
  "camera-test",
  "after-one-use",
  "grocery",
  "not-sponsored",
  "habit-break",
] as const;

export const PERSONA_IDS = [
  "skeptic",
  "convert",
  "parent",
  "maximalist",
  "student",
  "creator",
] as const;

export const PLATFORM_IDS = [
  "tiktok",
  "reels",
  "shorts",
  "meta",
  "pinterest",
] as const;

export const DURATIONS = [15, 30, 45] as const;

export const OFFER_IDS = [
  "none",
  "launch",
  "bundle",
  "flash",
  "holiday",
  "summer",
  "back-to-school",
  "prime",
  "bfcm",
] as const;

export const ANGLE_IDS = [
  "price",
  "proof",
  "ritual",
  "identity",
  "vs-rival",
] as const;

export const SPELLING_IDS = ["en-us", "en-gb", "en-in"] as const;

export const PRICE_LOCALE_IDS = ["usd", "gbp", "eur", "cad"] as const;

export const COMPETITOR_RULE_IDS = [
  "name-them",
  "dont-mock",
  "category-only",
] as const;

export const LEGAL_STAMP_IDS = ["none", "warn", "block", "signed-off"] as const;

export const REWRITE_STYLES = [
  "shorter",
  "dryer",
  "warmer",
  "more-proof",
  "global",
] as const;

export type FormatId = (typeof FORMAT_IDS)[number];
export type HookId = (typeof HOOK_IDS)[number];
export type PersonaId = (typeof PERSONA_IDS)[number];
export type PlatformId = (typeof PLATFORM_IDS)[number];
export type Duration = (typeof DURATIONS)[number];
export type OfferId = (typeof OFFER_IDS)[number];
export type AngleId = (typeof ANGLE_IDS)[number];
export type SpellingId = (typeof SPELLING_IDS)[number];
export type PriceLocaleId = (typeof PRICE_LOCALE_IDS)[number];
export type CompetitorRule = (typeof COMPETITOR_RULE_IDS)[number];
export type LegalStamp = (typeof LEGAL_STAMP_IDS)[number];
export type RewriteStyle = (typeof REWRITE_STYLES)[number];
export type ShelfView = "all" | "keepers" | "hidden" | "ab";
export type DeskView = "shelf" | "matrix" | "ab" | "opens" | "calendar" | "kit" | "alpha";
export type AbArm = "alpha" | "beta";

export type ClaimSource = {
  claim: string;
  source: string;
  url?: string;
};

export type PageAssetKind = "hero" | "pack" | "lifestyle" | "other";

export type PageAsset = {
  url: string;
  kind: PageAssetKind;
};

export type Rival = {
  name: string;
  url?: string;
  reason: string;
  price?: string;
};

export type ProductBrief = {
  name: string;
  brand: string;
  category: string;
  price: string;
  oneLiner: string;
  problem: string;
  outcome: string;
  mechanism: string;
  claims: string[];
  proof: string[];
  objections: string[];
  audience: string;
  ingredients: string[];
  differentiator: string;
  cta: string;
  setting: string;
  wardrobe: string;
  url?: string;
  source: "demo" | "url" | "typed";
  unit?: string;
  size?: string;
  boxContents?: string;
  skus?: string[];
  pageImages?: string[];
  pageAssets?: PageAsset[];
  competitor?: string;
  competitorUrl?: string;
  rivals?: Rival[];
  voiceSamples?: string[];
  claimSources?: ClaimSource[];
  stars?: string;
  reviewQuotes?: string[];
  tastesLike?: string;
  howToUse?: string;
  promotion?: string;
  benefits?: string[];
};

export type Combo = {
  format: FormatId;
  hook: HookId;
  persona: PersonaId;
  platform: PlatformId;
  duration: Duration;
};

export type Beat = {
  start: number;
  end: number;
  label: string;
  line: string;
  visual: string;
};

export type Shot = {
  start: number;
  end: number;
  frame: string;
  note: string;
};

export type HookScore = {
  value: number;
  label: "Strong" | "Solid" | "Soft";
  reasons: string[];
};

export type ClaimReport = {
  ok: boolean;
  flags: string[];
};

export type PolicyFlag = {
  id: string;
  severity: "block" | "warn";
  label: string;
  detail: string;
};

export type PolicyReport = {
  ok: boolean;
  flags: PolicyFlag[];
};

export type FieldLint = {
  field: string;
  chars: number;
  limit: number;
  ok: boolean;
  hint: string;
};

export type ShotClip = {
  label: string;
  url: string;
  start: number;
  end: number;
};

export type MintedAd = {
  id: string;
  number: number;
  combo: Combo;
  formatLabel: string;
  hookLabel: string;
  personaLabel: string;
  platformLabel: string;
  hook: string;
  beats: Beat[];
  onScreenText: string[];
  caption: string;
  hashtags: string[];
  metaPrimary: string;
  shotList: Shot[];
  creatorDirection: string[];
  imagePrompt: string;
  pinned?: boolean;
  hidden?: boolean;
  note?: string;
  pairId?: string;
  stillUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  shotClips?: ShotClip[];
  offer?: OfferId;
  hookScore?: HookScore;
  claims?: ClaimReport;
  policy?: PolicyReport;
  assignedCreatorId?: string;
  ctr?: string;
  winner?: boolean;
  killed?: boolean;
  mintedAt?: number;
  liveAt?: number;
  abLosses?: number;
  cpa?: string;
  thumbStop?: string;
  legalStamp?: LegalStamp;
  sparkCode?: string;
  utm?: string;
  webcamUrl?: string;
  altHooks?: string[];
  angle?: AngleId;
  sku?: string;
  endCard?: string;
  burnedCaptionUrl?: string;
  thumb9x16?: string;
  thumb1x1?: string;
  cutawayUrl?: string;
  openGroupId?: string;
  abArm?: AbArm;
  experimentId?: string;
  bundleUrl?: string;
};

export type FactoryFilters = {
  format: FormatId | "all";
  persona: PersonaId | "all";
  platform: PlatformId | "all";
  duration: Duration | "all";
  offer: OfferId;
  view: ShelfView;
  desk: DeskView;
};

export type Creator = {
  id: string;
  name: string;
  persona: PersonaId;
  wardrobe: string;
  notes: string;
  rights?: string;
  rate?: string;
  usageWindow?: string;
  organicRate?: string;
  paidRate?: string;
};

export type ProductPack = {
  id: string;
  title: string;
  query: string;
  brief: ProductBrief;
  ads: MintedAd[];
  used: string[];
  filters: FactoryFilters;
  savedAt: number;
};

export type BrandKit = {
  banned: string[];
  mustSay: string[];
  competitorRule: CompetitorRule;
  spelling: SpellingId;
  priceLocale: PriceLocaleId;
  voiceSamples: string[];
};

export type WinnerMemory = {
  id: string;
  product: string;
  brand: string;
  hookFamily: HookId;
  format: FormatId;
  persona: PersonaId;
  platform: PlatformId;
  hook: string;
  score: number;
  savedAt: number;
};

export type DropSlot = {
  day: number;
  adId: string | null;
  platform: PlatformId;
  offer: OfferId;
};

export type WriteBriefResult =
  | { ok: true; brief: ProductBrief }
  | { ok: false; error: string };

export const DEFAULT_USAGE =
  "Whitelisted 30 days. Organic and paid usage. No paid social unless restated.";

export const WEAK_HOOK_FLOOR = 50;

export const FATIGUE_DAYS = 11;

export const DEFAULT_KIT: BrandKit = {
  banned: [],
  mustSay: [],
  competitorRule: "dont-mock",
  spelling: "en-us",
  priceLocale: "usd",
  voiceSamples: [],
};
