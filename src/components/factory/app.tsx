import { Download, Home, LoaderCircle, Plus, Video, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AbBoard } from "@/components/factory/ab-board";
import { AdCard } from "@/components/factory/ad-card";
import { AdDialog } from "@/components/factory/ad-dialog";
import { AlphaBoard } from "@/components/factory/alpha-board";
import { BrandKitPanel } from "@/components/factory/brand-kit-panel";
import { BriefRail, ScrapeCard } from "@/components/factory/brief-rail";
import { CalendarView } from "@/components/factory/calendar-view";
import { FilterBar } from "@/components/factory/filter-bar";
import { MatrixView } from "@/components/factory/matrix-view";
import { OpensBoard } from "@/components/factory/opens-board";
import { PressMark } from "@/components/press-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cloneKeeper, mintAngles, mintLine } from "@/lib/factory/angles";
import { mintFormatAlphaBeta } from "@/lib/factory/alpha";
import {
  applyOfferToAds,
  decorateAd,
  exportAds,
  findPair,
  visibleAds,
} from "@/lib/factory/craft";
import { autoAssignAds, emptyCalendar, fillCalendar } from "@/lib/factory/desk";
import { DEMO_CHIPS, localBriefFromQuery } from "@/lib/factory/demos";
import { sanitizeBrief } from "@/lib/factory/english";
import { hostOf, isProductStill } from "@/lib/factory/assets";
import {
  downloadAdsJson,
  downloadCsv,
  downloadPack,
  downloadZipPack,
  printCallSheet,
} from "@/lib/factory/export-pack";
import { applyKitToAds, loadKit, normalizeKit, saveKit } from "@/lib/factory/kit";
import {
  mintBatch,
  mintChallenger,
  mintGaps,
  resetSerial,
  winningSeeds,
} from "@/lib/factory/mint";
import { forgetWinner, loadWinners, rememberWinner, saveWinners } from "@/lib/factory/memory";
import { offerLabel } from "@/lib/factory/offers";
import {
  applyOpen,
  applyPerformance,
  mintOpens,
  parsePerformanceCsv,
  recordAbWinner,
} from "@/lib/factory/performance";
import { renderAdVideo } from "@/lib/factory/render-video";
import {
  EMPTY_FILTERS,
  loadCalendar,
  loadFactory,
  loadResume,
  saveCalendar,
  saveFactory,
  saveResume,
  videoSlotsLeft,
  VIDEO_DAY_MAX,
  type ResumeState,
} from "@/lib/factory/storage";
import type {
  BrandKit,
  Creator,
  DropSlot,
  FactoryFilters,
  FormatId,
  MintedAd,
  PlatformId,
  ProductBrief,
  ProductPack,
  ScrapeReport,
  WinnerMemory,
} from "@/lib/factory/types";
import { DEFAULT_KIT } from "@/lib/factory/types";
import { writeProductBrief } from "@/lib/factory/write-brief";

function mintSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export function FactoryApp() {
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<ProductBrief | null>(null);
  const [ads, setAds] = useState<MintedAd[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [filters, setFilters] = useState<FactoryFilters>(EMPTY_FILTERS);
  const [openAd, setOpenAd] = useState<MintedAd | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [packs, setPacks] = useState<ProductPack[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);
  const [packTitle, setPackTitle] = useState("");
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [renderNote, setRenderNote] = useState<string | null>(null);
  const [slots, setSlots] = useState(VIDEO_DAY_MAX);
  const [pullingRival, setPullingRival] = useState(false);
  const [kit, setKit] = useState<BrandKit>(DEFAULT_KIT);
  const [winners, setWinners] = useState<WinnerMemory[]>([]);
  const [calendar, setCalendar] = useState<DropSlot[]>(emptyCalendar());
  const renderingRef = useRef(false);
  const csvRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef("");
  const writeGen = useRef(0);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [scrape, setScrape] = useState<ScrapeReport | null>(null);

  function stashResume(next: ResumeState) {
    setResume(next);
    saveResume(next);
  }

  useEffect(() => {
    const saved = loadFactory();
    const storedResume = loadResume();
    if (saved) {
      setPacks(saved.packs);
      setCreators(saved.creators);
      setActiveCreatorId(saved.activeCreatorId);
    }
    const candidate =
      storedResume ??
      (saved?.brief
        ? {
            query: saved.query,
            brief: saved.brief,
            ads: saved.ads,
            used: saved.used,
            filters: saved.filters,
          }
        : null);
    if (candidate?.brief) {
      const clean = sanitizeBrief(candidate.brief);
      const next = { ...candidate, brief: clean };
      setResume(next);
      saveResume(next);
    }
    setKit(loadKit());
    setWinners(loadWinners());
    const cal = loadCalendar();
    if (cal?.length) setCalendar(cal);
    setSlots(videoSlotsLeft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFactory({
      query,
      brief,
      ads,
      used,
      filters,
      packs,
      creators,
      activeCreatorId,
    });
  }, [hydrated, query, brief, ads, used, filters, packs, creators, activeCreatorId]);

  useEffect(() => {
    if (!hydrated) return;
    saveKit(kit);
  }, [hydrated, kit]);

  useEffect(() => {
    if (!hydrated) return;
    saveWinners(winners);
  }, [hydrated, winners]);

  useEffect(() => {
    if (!hydrated) return;
    saveCalendar(calendar);
  }, [hydrated, calendar]);

  const shown = useMemo(() => {
    if (filters.desk === "ab") return visibleAds(ads, "ab");
    return visibleAds(ads, filters.view);
  }, [ads, filters.view, filters.desk]);
  const openFull = openAd ? (ads.find((item) => item.id === openAd.id) ?? openAd) : null;
  const pairAd = openFull ? findPair(ads, openFull) : null;
  const activeCreator = creators.find((item) => item.id === activeCreatorId) ?? null;
  const keepers = useMemo(
    () => ads.filter((ad) => ad.pinned && !ad.hidden && !ad.killed),
    [ads],
  );
  const batchLabel = ads.length
    ? `${ads.length} minted · ${shown.length} on shelf`
    : "No ads minted yet";

  function finishMint(next: MintedAd[], product: ProductBrief): MintedAd[] {
    return autoAssignAds(applyKitToAds(next, product, kit), creators).map((ad) =>
      decorateAd(ad, product, kit),
    );
  }

  function applyBrief(next: ProductBrief, nextQuery: string) {
    try {
      const clean = sanitizeBrief({
        ...next,
        voiceSamples: next.source === "demo" ? next.voiceSamples : next.voiceSamples,
      });
      resetSerial(0);
      const seed = mintSeed();
      const minted = mintBatch(clean, filters, new Set(), 8, seed);
      const alpha = mintFormatAlphaBeta(clean, filters, minted.used, seed + 17, 2);
      let ads = [...alpha.ads, ...minted.ads];
      let used = alpha.used;
      let killed = minted.killed + alpha.killed;
      if (clean.competitor || (clean.rivals && clean.rivals.length)) {
        const vs = mintBatch(
          clean,
          { ...filters, format: "comparison" },
          used,
          Math.min(3, Math.max(1, clean.rivals?.length ?? 1)),
          seed + 41,
          winningSeeds(ads),
        );
        ads = [...vs.ads, ...ads];
        used = vs.used;
        killed += vs.killed;
      }
      const finished = finishMint(ads, clean);
      setQuery(nextQuery);
      queryRef.current = nextQuery;
      setBrief(clean);
      setAds(finished);
      setUsed([...used]);
      setReady(true);
      setWriting(false);
      setError(null);
      setOpenAd(null);
      setCalendar(emptyCalendar());
      setFilters((prev) => ({ ...prev, desk: "shelf", view: "all" }));
      stashResume({
        query: nextQuery,
        brief: clean,
        ads: finished,
        used: [...used],
        filters: { ...filters, desk: "shelf", view: "all" },
      });
      const rivalN = clean.rivals?.length ?? 0;
      toast.message(
        [
          rivalN ? `${rivalN} rivals scouted` : null,
          `${alpha.ads.length} format α/β ads`,
          killed ? `${killed} weak hooks killed` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Press swarm done",
      );
    } catch {
      setWriting(false);
      setError("Could not mint ads from that brief. Try demo.");
    }
  }

  function clearProduct() {
    setBrief(null);
    setAds([]);
    setUsed([]);
    setOpenAd(null);
    setCalendar(emptyCalendar());
    setFilters(EMPTY_FILTERS);
    resetSerial(0);
  }

  async function onWrite(raw?: string) {
    const value = (raw ?? queryRef.current ?? query).trim();
    if (!value) {
      setError("Paste a product URL, or type demo.");
      return;
    }
    const gen = ++writeGen.current;
    queryRef.current = value;
    setQuery(value);
    if (brief) {
      stashResume({
        query: brief.url || query,
        brief,
        ads,
        used,
        filters,
      });
    }
    clearProduct();
    setReady(false);
    setWriting(true);
    setError(null);
    setScrape(null);

    const local = localBriefFromQuery(value);
    if (local) {
      if (gen !== writeGen.current) return;
      applyBrief(local, value);
      toast.message(`Brief written for ${local.name}`);
      return;
    }
    try {
      const result = await writeProductBrief({ data: { query: value } });
      if (gen !== writeGen.current) return;
      if (result.scrape) setScrape(result.scrape);
      if (!result.ok) {
        setWriting(false);
        setError(result.error);
        return;
      }
      applyBrief(result.brief, value);
      toast.message(
        result.scrape
          ? `Scraped ${result.scrape.host} · brief written for ${result.brief.name}`
          : `Brief written for ${result.brief.name}`,
      );
    } catch {
      if (gen !== writeGen.current) return;
      setWriting(false);
      setError("Could not write that brief. Try demo, or a shorter description.");
    }
  }

  function onMintMore() {
    if (!brief) return;
    const minted = mintBatch(
      brief,
      filters,
      new Set(used),
      8,
      mintSeed(),
      winningSeeds(ads),
    );
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    toast.message(
      minted.killed
        ? `Eight more. ${minted.killed} weak hooks killed.`
        : "Eight more on the press",
    );
  }

  function onFillGaps() {
    if (!brief) return;
    const minted = mintGaps(brief, ads, new Set(used), mintSeed(), filters.offer);
    if (!minted.ads.length) {
      toast.message("No holes left in this matrix.");
      return;
    }
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    toast.message(
      minted.killed
        ? `Filled ${minted.ads.length} holes. ${minted.killed} weak hooks killed.`
        : `Filled ${minted.ads.length} holes in the matrix`,
    );
  }

  function onMintVsRival() {
    if (!brief?.competitor) {
      toast.message("Add a competitor, then mint vs rival.");
      return;
    }
    const minted = mintBatch(
      brief,
      { ...filters, format: "comparison" },
      new Set(used),
      4,
      mintSeed(),
      winningSeeds(ads),
    );
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    toast.message(`Minted vs ${brief.competitor}`);
  }

  function onMintAngles() {
    if (!brief) return;
    const minted = mintAngles(brief, filters, new Set(used), mintSeed(), creators);
    if (!minted.ads.length) {
      toast.message("Could not mint an angle row.");
      return;
    }
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    toast.message(
      minted.killed
        ? `Angle row on the shelf. ${minted.killed} weak hooks killed.`
        : "Angle row on the shelf — price, proof, ritual, identity, vs rival",
    );
  }

  function onMintLine() {
    if (!brief) return;
    const minted = mintLine(brief, filters, new Set(used), mintSeed(), creators);
    if (!minted.ads.length) {
      toast.message("Add SKUs on the brief, then mint a line.");
      return;
    }
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    toast.message("Line campaign — one persona, different end cards");
  }

  function onMintAlpha() {
    if (!brief) return;
    const minted = mintFormatAlphaBeta(brief, filters, new Set(used), mintSeed(), 2);
    if (!minted.ads.length) {
      toast.message("Could not mint a format α/β test.");
      return;
    }
    setAds((prev) => [...finishMint(minted.ads, brief), ...prev].slice(0, 96));
    setUsed([...minted.used]);
    setFilters((prev) => ({ ...prev, desk: "alpha" }));
    toast.message("Format α/β on the board — same hook family, two formats");
  }

  function onImportCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const rows = parsePerformanceCsv(text);
      if (!rows.length) {
        toast.message("No CTR / CPA / thumb-stop columns found.");
        return;
      }
      const result = applyPerformance(ads, rows);
      setAds(result.ads);
      toast.message(`Imported performance for ${result.matched} ads`);
    };
    reader.readAsText(file);
  }

  function onCloneWinner(item: WinnerMemory) {
    if (!brief) return;
    const result = cloneKeeper(brief, item, new Set(used), mintSeed(), filters.offer);
    if (!result) {
      toast.message("Could not clone that keeper.");
      return;
    }
    setAds((prev) => [...finishMint([result.ad], brief), ...prev].slice(0, 96));
    setUsed([...result.used]);
    setOpenAd(result.ad);
    toast.message(`Cloned ${item.hookFamily} onto ${brief.name}`);
  }

  function onApplyKit() {
    if (!brief) {
      saveKit(normalizeKit(kit));
      toast.message("Kit saved — it survives New");
      return;
    }
    const next = normalizeKit(kit);
    saveKit(next);
    setKit(next);
    setAds((prev) => prev.map((ad) => decorateAd(applyKitToAds([ad], brief, next)[0]!, brief, next)));
    if (next.voiceSamples.length) {
      setBrief({ ...brief, voiceSamples: next.voiceSamples });
    }
    toast.message("Kit applied to this shelf");
  }

  function onPickOpen(ad: MintedAd, hook: string) {
    if (!brief) return;
    patchAd(applyOpen(ad, hook, brief));
    toast.message("Open locked — same body");
  }

  function onMintOpenFamily(ad: MintedAd) {
    if (!brief) return;
    const minted = mintOpens(brief, ad, new Set(used), mintSeed());
    if (!minted.ads.length) {
      toast.message("No unused opens left for that combo.");
      return;
    }
    setAds((prev) => {
      const tagged = prev.map((item) =>
        item.id === ad.id ? { ...item, openGroupId: ad.openGroupId ?? ad.id, pairId: ad.openGroupId ?? ad.id } : item,
      );
      return [...finishMint(minted.ads, brief), ...tagged].slice(0, 96);
    });
    setUsed([...minted.used]);
    setFilters((prev) => ({ ...prev, desk: "ab" }));
    toast.message("Three opens on the A/B board — same body");
  }

  function onRemint() {
    if (!brief) return;
    applyBrief(brief, brief.url || queryRef.current || query);
    toast.message("Reminted from the brief");
  }

  function onReset() {
    writeGen.current += 1;
    if (brief) {
      stashResume({
        query: brief.url || query,
        brief,
        ads,
        used,
        filters,
      });
    }
    resetSerial(0);
    queryRef.current = "";
    setQuery("");
    clearProduct();
    setReady(false);
    setWriting(false);
    setError(null);
  }

  function onContinue() {
    if (!resume?.brief) return;
    const clean = sanitizeBrief(resume.brief);
    const maxNum = resume.ads.reduce((m, ad) => Math.max(m, ad.number), 0);
    resetSerial(maxNum);
    queryRef.current = resume.query;
    setQuery(resume.query);
    setBrief(clean);
    setAds(resume.ads);
    setUsed(resume.used);
    setFilters({ ...EMPTY_FILTERS, ...resume.filters });
    setReady(true);
    setWriting(false);
    setError(null);
    setOpenAd(null);
    setScrape(null);
  }

  function patchAd(next: MintedAd) {
    const decorated = brief ? decorateAd(next, brief, kit) : next;
    setAds((prev) => prev.map((item) => (item.id === decorated.id ? decorated : item)));
  }

  function onChallenger(from?: MintedAd | null) {
    const source = from ?? openFull;
    if (!brief || !source) return;
    const result = mintChallenger(brief, source, new Set(used), mintSeed());
    if (!result) {
      toast.message("No unused hook left for that combo.");
      return;
    }
    const pairId = source.pairId ?? source.id;
    const challenger = finishMint([result.ad], brief)[0]!;
    setAds((prev) => {
      const next = prev.map((item) =>
        item.id === source.id ? { ...item, pairId } : item,
      );
      return [challenger, ...next.filter((item) => item.id !== challenger.id)];
    });
    setUsed([...result.used]);
    setOpenAd(challenger);
    setFilters((prev) => ({ ...prev, desk: "ab" }));
    toast.message("Challenger minted");
  }

  function onFilters(next: FactoryFilters) {
    if (brief && next.offer !== filters.offer) {
      setAds((prev) => applyOfferToAds(prev, brief, next.offer));
      toast.message(`Offer applied — ${offerLabel(next.offer)}. No remint.`);
    }
    setFilters(next);
  }

  function onExportMd() {
    if (!brief) return;
    const pack = exportAds(ads);
    if (!pack.length) return;
    downloadPack(brief, pack);
    toast.message("Markdown pack downloaded");
  }

  function onExportCsv() {
    if (!brief) return;
    const pack = exportAds(ads);
    if (!pack.length) return;
    downloadCsv(brief, pack);
    toast.message("CSV downloaded");
  }

  function onExportJson() {
    if (!brief) return;
    const pack = exportAds(ads);
    if (!pack.length) return;
    downloadAdsJson(brief, pack);
    toast.message("Ads manager JSON downloaded");
  }

  function onExportZip() {
    if (!brief) return;
    const pack = exportAds(ads);
    if (!pack.length) return;
    downloadZipPack(brief, pack, activeCreator);
    toast.message("Handoff ZIP downloaded");
  }

  function onPrintSheet() {
    if (!brief) return;
    const pack = exportAds(ads);
    if (!pack.length) return;
    printCallSheet(brief, pack, activeCreator);
  }

  function onSavePack() {
    if (!brief) return;
    const title = packTitle.trim() || brief.name;
    const pack: ProductPack = {
      id: `${Date.now()}`,
      title,
      query,
      brief,
      ads,
      used,
      filters,
      savedAt: Date.now(),
    };
    setPacks((prev) => [pack, ...prev.filter((item) => item.title !== title)].slice(0, 24));
    setPackTitle("");
    toast.message(`Saved pack “${title}”`);
  }

  function onLoadPack(pack: ProductPack) {
    const clean = sanitizeBrief(pack.brief);
    const maxNum = pack.ads.reduce((m, ad) => Math.max(m, ad.number), 0);
    resetSerial(maxNum);
    setQuery(pack.query);
    setBrief(clean);
    setAds(pack.ads);
    setUsed(pack.used);
    setFilters({ ...EMPTY_FILTERS, ...pack.filters });
    setReady(true);
    setOpenAd(null);
    toast.message(`Opened ${pack.title}`);
  }

  function onSelectCreator(id: string | null) {
    setActiveCreatorId(id);
    if (!id || !brief) return;
    const creator = creators.find((item) => item.id === id);
    if (!creator) return;
    setBrief({
      ...brief,
      wardrobe: creator.wardrobe || brief.wardrobe,
    });
  }

  function onDeleteCreator(id: string) {
    setCreators((prev) => prev.filter((item) => item.id !== id));
    if (activeCreatorId === id) setActiveCreatorId(null);
  }

  function onDeletePack(id: string) {
    setPacks((prev) => prev.filter((item) => item.id !== id));
  }

  async function runVideo(ad: MintedAd, sequence = false) {
    if (!brief) return;
    if (renderingRef.current) {
      toast.message("A video is already rendering.");
      return;
    }
    renderingRef.current = true;
    setRenderingId(ad.id);
    setRenderNote(
      sequence
        ? `Rendering a ${ad.combo.duration}s sequence of 6s shots.`
        : "Rendering a 9:16 UGC video — about a minute.",
    );
    toast.message(
      sequence
        ? `Rendering a ${ad.combo.duration}s sequence — a few minutes.`
        : "Rendering a 9:16 UGC video — about a minute.",
    );
    try {
      const result = await renderAdVideo(ad, brief, {
        sequence,
        onProgress: (message) => setRenderNote(message),
      });
      if (result.ok) {
        setAds((prev) =>
          prev.map((item) =>
            item.id === ad.id
              ? {
                  ...item,
                  videoUrl: result.url,
                  shotClips: result.clips,
                  bundleUrl: result.bundleUrl ?? (result.clips.length > 1 ? result.url : item.bundleUrl),
                }
              : item,
          ),
        );
        toast.message(sequence ? "Sequence ready" : "Video ready");
      } else {
        toast.message(result.error);
      }
    } finally {
      renderingRef.current = false;
      setRenderingId(null);
      setRenderNote(null);
      setSlots(videoSlotsLeft());
    }
  }

  async function onRenderKeepers() {
    if (!brief) return;
    const targets = keepers.slice(0, 3);
    if (!targets.length) {
      toast.message("Pin keepers first.");
      return;
    }
    if (renderingRef.current) {
      toast.message("A video is already rendering.");
      return;
    }
    toast.message(`Rendering ${targets.length} keeper clip${targets.length === 1 ? "" : "s"}.`);
    for (const ad of targets) {
      if (videoSlotsLeft() < 1) {
        toast.message("Daily clip limit reached.");
        break;
      }
      await runVideo(ad, false);
    }
  }

  function leadAd(): MintedAd | null {
    return shown.find((item) => item.pinned) ?? shown[0] ?? ads[0] ?? null;
  }

  function onGenerateLeadVideo() {
    const target = leadAd();
    if (!target) {
      toast.message("Mint an ad first, then generate video.");
      return;
    }
    void runVideo(target, false);
  }

  function onGenerateLeadSequence() {
    const target = leadAd();
    if (!target) {
      toast.message("Mint an ad first, then generate a sequence.");
      return;
    }
    void runVideo(target, true);
  }

  async function onPullCompetitor(url: string) {
    if (!brief) return;
    setPullingRival(true);
    try {
      const result = await writeProductBrief({ data: { query: url } });
      if (!result.ok) {
        toast.message(result.error);
        return;
      }
      setBrief({
        ...brief,
        competitor: result.brief.name,
        competitorUrl: url,
      });
      toast.message(`Rival locked: ${result.brief.name}`);
    } catch {
      toast.message("Could not read that rival page.");
    } finally {
      setPullingRival(false);
    }
  }

  function onLockStill(url: string) {
    const target = openFull ?? leadAd();
    if (!target) {
      toast.message("Mint an ad, then lock a still.");
      return;
    }
    if (brief?.url && !isProductStill(url, brief.url)) {
      toast.message("That still is not from this product page.");
      return;
    }
    patchAd({ ...target, stillUrl: url, cutawayUrl: url });
    toast.message("Page still locked for image-to-video");
  }

  function onMatrixCell(format: FormatId, platform: PlatformId) {
    setFilters((prev) => ({ ...prev, format, platform, desk: "shelf" }));
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="press-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 md:px-6 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {ready ? (
              <button
                type="button"
                onClick={onReset}
                className="flex min-w-0 items-center gap-3 text-left"
                aria-label="Home"
              >
                <PressMark />
                <div className="min-w-0">
                  <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                    Press room · English · Global
                  </p>
                  <h1 className="font-display text-2xl leading-none text-fg md:text-3xl">
                    UGC Factory
                  </h1>
                </div>
              </button>
            ) : (
              <>
                <PressMark />
                <div className="min-w-0">
                  <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                    Press room · English · Global
                  </p>
                  <h1 className="font-display text-2xl leading-none text-fg md:text-3xl">
                    UGC Factory
                  </h1>
                </div>
              </>
            )}
          </div>
          {ready ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={onReset} aria-label="Home">
                <Home />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Button variant="paper" onClick={onGenerateLeadVideo} disabled={!!renderingId}>
                {renderingId ? <LoaderCircle className="animate-spin" /> : <Video />}
                Generate video
              </Button>
              <Button onClick={onMintMore} className="hidden sm:inline-flex">
                <Plus />
                Mint 8 more
              </Button>
            </div>
          ) : (
            <p className="hidden text-xs text-fg-subtle md:block">
              16 formats · 31 hooks · 6 personas · 5 platforms · Video
            </p>
          )}
        </header>

        {!ready ? (
          <main className="flex flex-1 flex-col justify-center py-12 md:py-20">
            <p className="font-display text-4xl leading-tight tracking-tight text-fg md:text-6xl">
              Paste a product.
              <br />
              <span className="italic text-steel">Generate the video.</span>
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
              Paste a public product URL or type demo. The press scrapes that page
              only — product, problem, how it is used, how to promote it, and
              page assets. Then mint ads and hit Generate video.
            </p>

            <form
              className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const live = String(new FormData(event.currentTarget).get("query") ?? "").trim();
                void onWrite(live || queryRef.current);
              }}
            >
              <label className="sr-only" htmlFor="product-query">
                Product URL or demo
              </label>
              <Input
                id="product-query"
                name="query"
                value={query}
                onChange={(event) => {
                  queryRef.current = event.target.value;
                  setQuery(event.target.value);
                }}
                placeholder="Paste a product URL, or type demo"
                autoComplete="off"
                disabled={writing}
              />
              <Button
                type="submit"
                variant="paper"
                size="lg"
                disabled={writing}
                className="sm:w-44"
              >
                {writing ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Scraping
                  </>
                ) : (
                  "Write brief"
                )}
              </Button>
            </form>

            {writing ? (
              <div className="mt-4 max-w-2xl">
                <ScrapeCard running />
              </div>
            ) : scrape ? (
              <div className="mt-4 max-w-2xl">
                <ScrapeCard report={scrape} />
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-stamp" role="alert">
                {error}
              </p>
            ) : null}

            {resume?.brief && !writing ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onContinue}
                  className="rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong hover:bg-bg-subtle"
                >
                  <span className="block text-xs tracking-widest text-fg-subtle uppercase">
                    Continue last brief
                  </span>
                  <span className="mt-1 block text-sm text-fg">{resume.brief.name}</span>
                  <span className="block text-xs text-fg-subtle">
                    {hostOf(resume.brief.url || resume.query) ?? resume.brief.brand}
                  </span>
                </button>
              </div>
            ) : null}

            <div className="mt-8">
              <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
                Samples
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      queryRef.current = chip.id;
                      setQuery(chip.id);
                      void onWrite(chip.id);
                    }}
                    className="rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong hover:bg-bg-subtle"
                  >
                    <span className="block text-sm text-fg">{chip.label}</span>
                    <span className="block text-xs text-fg-subtle">{chip.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </main>
        ) : brief ? (
          <main className="mt-8 grid flex-1 gap-6 md:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)]">
            <BriefRail
              className="order-2 md:order-1"
              brief={brief}
              onChange={setBrief}
              onReset={onReset}
              onRemint={onRemint}
              onPullCompetitor={(url) => void onPullCompetitor(url)}
              onLockStill={onLockStill}
              pullingRival={pullingRival}
              creators={creators}
              activeCreatorId={activeCreatorId}
              onSaveCreator={(creator) =>
                setCreators((prev) =>
                  [{ ...creator, id: `${Date.now()}` }, ...prev].slice(0, 24),
                )
              }
              onSelectCreator={onSelectCreator}
              onDeleteCreator={onDeleteCreator}
            />
            <section className="order-1 min-w-0 space-y-5 md:order-2">
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const live = String(new FormData(event.currentTarget).get("query") ?? "").trim();
                  void onWrite(live || queryRef.current);
                }}
              >
                <Input
                  name="query"
                  value={query}
                  onChange={(event) => {
                    queryRef.current = event.target.value;
                    setQuery(event.target.value);
                  }}
                  placeholder="Paste another URL, or type demo"
                  autoComplete="off"
                  disabled={writing}
                />
                <Button type="submit" variant="outline" disabled={writing}>
                  {writing ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Scraping
                    </>
                  ) : (
                    "Rewrite brief"
                  )}
                </Button>
              </form>
              {error ? (
                <p className="text-sm text-stamp" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-elevated p-3 sm:flex-row">
                <Input
                  value={packTitle}
                  onChange={(event) => setPackTitle(event.target.value)}
                  placeholder="Name this pack"
                  className="h-11"
                />
                <Button variant="outline" onClick={onSavePack}>
                  Save pack
                </Button>
              </div>
              {packs.length ? (
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-border"
                    >
                      <button
                        type="button"
                        onClick={() => onLoadPack(pack)}
                        className="h-full px-4 text-xs text-fg-muted hover:text-fg"
                      >
                        {pack.title}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete pack ${pack.title}`}
                        onClick={() => onDeletePack(pack.id)}
                        className="flex size-11 items-center justify-center text-fg-subtle hover:text-fg"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                  {batchLabel} · {slots} clips left today
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onExportMd} className="sm:hidden">
                    Markdown
                  </Button>
                  <Button variant="outline" size="sm" onClick={onExportCsv}>
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportJson}
                    className="hidden sm:inline-flex"
                  >
                    Ads JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrintSheet}
                    className="hidden sm:inline-flex"
                  >
                    Call sheet
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-fg">Generate a 9:16 UGC video</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      One 6s hook clip, or a 15s / 30s sequence of 6s shots with
                      overlay captions and an end card. {slots} of {VIDEO_DAY_MAX} left today.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="paper"
                      onClick={onGenerateLeadVideo}
                      disabled={!!renderingId || shown.length === 0}
                      className="shrink-0"
                    >
                      {renderingId ? <LoaderCircle className="animate-spin" /> : <Video />}
                      Generate video
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onGenerateLeadSequence}
                      disabled={!!renderingId || shown.length === 0}
                    >
                      Sequence
                    </Button>
                  </div>
                </div>
                {renderNote ? (
                  <p className="text-xs text-fg-muted" role="status">
                    {renderNote}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onRenderKeepers()}
                  disabled={!!renderingId || keepers.length === 0}
                >
                  Render {Math.min(3, keepers.length) || 3} keepers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMintVsRival}
                  disabled={!brief.competitor}
                >
                  Mint vs rival
                </Button>
                <Button variant="outline" size="sm" onClick={onMintAngles}>
                  Mint angles
                </Button>
                <Button variant="outline" size="sm" onClick={onMintLine}>
                  Line campaign
                </Button>
                <Button variant="outline" size="sm" onClick={onMintAlpha}>
                  Format α/β
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => csvRef.current?.click()}
                >
                  Import CTR CSV
                </Button>
                <input
                  ref={csvRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onImportCsv(file);
                    event.target.value = "";
                  }}
                />
              </div>

              <FilterBar filters={filters} onChange={onFilters} />

              {filters.desk === "matrix" ? (
                <MatrixView ads={ads} onFill={onFillGaps} onCell={onMatrixCell} />
              ) : filters.desk === "ab" ? (
                <AbBoard
                  ads={ads}
                  onOpen={setOpenAd}
                  onWinner={(ad) => {
                    setAds((prev) => recordAbWinner(prev, ad));
                    setWinners(rememberWinner(brief, ad));
                    toast.message("Winner locked — two losses auto-kill a combo");
                  }}
                  onCtr={(ad, ctr) => patchAd({ ...ad, ctr })}
                  onChallenger={(ad) => onChallenger(ad)}
                />
              ) : filters.desk === "alpha" ? (
                <AlphaBoard
                  ads={ads}
                  onOpen={setOpenAd}
                  onWinner={(ad) => {
                    setAds((prev) => recordAbWinner(prev, ad));
                    setWinners(rememberWinner(brief, ad));
                    toast.message("Format winner locked — next mint leans this format");
                  }}
                  onMint={onMintAlpha}
                />
              ) : filters.desk === "opens" ? (
                <OpensBoard
                  ads={ads}
                  onOpen={setOpenAd}
                  onPick={onPickOpen}
                  onMintOpens={onMintOpenFamily}
                />
              ) : filters.desk === "calendar" ? (
                <CalendarView
                  slots={calendar}
                  ads={ads}
                  onChange={setCalendar}
                  onFill={() => setCalendar(fillCalendar(ads, filters.offer))}
                  onOpen={setOpenAd}
                />
              ) : filters.desk === "kit" ? (
                <BrandKitPanel
                  kit={kit}
                  onChange={setKit}
                  onApply={onApplyKit}
                  winners={winners}
                  onClone={onCloneWinner}
                  onForget={(id) => setWinners(forgetWinner(id))}
                  productName={brief.name}
                />
              ) : shown.length === 0 ? (
                <p className="rounded-xl border border-border bg-bg-elevated px-4 py-8 text-sm text-fg-muted">
                  Nothing on this shelf. Pin keepers, unhide ads, or mint 8 more.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {shown.map((ad, index) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      index={index}
                      rendering={renderingId === ad.id}
                      onOpen={() => setOpenAd(ad)}
                      onPin={() => patchAd({ ...ad, pinned: !ad.pinned, liveAt: ad.pinned ? ad.liveAt : Date.now() })}
                      onHide={() => patchAd({ ...ad, hidden: !ad.hidden })}
                      onVideo={() => void runVideo(ad, false)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  variant="paper"
                  onClick={onGenerateLeadVideo}
                  disabled={!!renderingId || ads.length === 0}
                  className="sm:flex-1"
                >
                  {renderingId ? <LoaderCircle className="animate-spin" /> : <Video />}
                  Generate video
                </Button>
                <Button onClick={onMintMore} className="sm:flex-1">
                  <Plus />
                  Mint 8 more
                </Button>
                <Button variant="outline" onClick={onExportZip} className="sm:flex-1">
                  <Download />
                  Export pack
                </Button>
              </div>
            </section>
          </main>
        ) : null}

        <footer className="mt-auto pt-10 text-xs text-fg-subtle">
          Paste a product URL. The press scrapes that page only, writes the brief,
          then Generate video. Home starts a clean paste. English, global.
        </footer>
      </div>

      <AdDialog
        ad={openFull}
        brief={brief}
        creator={activeCreator}
        pair={pairAd}
        creators={creators}
        videoBusy={openFull ? renderingId === openFull.id : false}
        renderNote={renderNote}
        onClose={() => setOpenAd(null)}
        onChange={patchAd}
        onChallenger={() => onChallenger(openFull)}
        onOpenPair={() => {
          if (pairAd) setOpenAd(pairAd);
        }}
        onVideo={() => {
          if (openFull) void runVideo(openFull, false);
        }}
        onSequence={() => {
          if (openFull) void runVideo(openFull, true);
        }}
        onAssign={(creatorId) => {
          if (openFull) {
            patchAd({ ...openFull, assignedCreatorId: creatorId ?? undefined });
          }
        }}
      />
    </div>
  );
}
