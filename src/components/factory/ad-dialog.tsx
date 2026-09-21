import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssemblyPlayer } from "@/components/factory/assembly-player";
import { CopyButton } from "@/components/factory/copy-button";
import { Filmstrip } from "@/components/factory/filmstrip";
import { SafeZonePreview } from "@/components/factory/safe-zone-preview";
import { Teleprompter } from "@/components/factory/teleprompter";
import { applyRewrite, generateStill, rewriteAdCopy, speakScript } from "@/lib/factory/ai";
import { landingBlock } from "@/lib/factory/captions";
import { decorateAd, lintAd } from "@/lib/factory/craft";
import { rateCard, shotLoad, utmFor } from "@/lib/factory/desk";
import {
  downloadCapCut,
  downloadLanding,
  downloadPremiere,
  downloadSrt,
  downloadVtt,
  packMarkdown,
  printCallSheet,
  printShootPack,
  printTalentBrief,
} from "@/lib/factory/export-pack";
import { displayPrice } from "@/lib/factory/locale";
import { offerLabel } from "@/lib/factory/offers";
import { fatigueNote } from "@/lib/factory/performance";
import { CALL_SHEET_CHECKS } from "@/lib/factory/policy";
import { sourceForClaim } from "@/lib/factory/reviews";
import { burnCaptions, downloadDataUrl, pickThumbnails, startBed, stitchClips } from "@/lib/factory/ship";
import { peekKit } from "@/lib/factory/kit";
import type {
  Creator,
  LegalStamp,
  MintedAd,
  PlatformId,
  ProductBrief,
  RewriteStyle,
} from "@/lib/factory/types";
import { padNum } from "@/lib/utils";

function Section({
  title,
  children,
  copy,
}: {
  title: string;
  children: ReactNode;
  copy?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
          {title}
        </h3>
        {copy ? <CopyButton text={copy} label="Copy" variant="quiet" /> : null}
      </div>
      {children}
    </section>
  );
}

const STYLES: { id: RewriteStyle; label: string }[] = [
  { id: "shorter", label: "Shorter" },
  { id: "dryer", label: "Dryer" },
  { id: "warmer", label: "Warmer" },
  { id: "more-proof", label: "More proof" },
  { id: "global", label: "Global English" },
];

export function AdDialog({
  ad,
  brief,
  creator,
  creators,
  pair,
  videoBusy,
  renderNote,
  onClose,
  onChange,
  onChallenger,
  onOpenPair,
  onVideo,
  onSequence,
  onAssign,
}: {
  ad: MintedAd | null;
  brief: ProductBrief | null;
  creator?: Creator | null;
  creators?: Creator[];
  pair?: MintedAd | null;
  videoBusy?: boolean;
  renderNote?: string | null;
  onClose: () => void;
  onChange: (ad: MintedAd) => void;
  onChallenger: () => void;
  onOpenPair?: () => void;
  onVideo: () => void;
  onSequence: () => void;
  onAssign: (creatorId: string | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [prompter, setPrompter] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [bedOn, setBedOn] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<PlatformId>("tiktok");
  const bedHandle = useRef<ReturnType<typeof startBed>>(null);

  useEffect(() => {
    setPrompter(false);
    setAudioUrl(ad?.voiceUrl ?? null);
    setBusy(null);
    setPreviewPlatform(ad?.combo.platform ?? "tiktok");
  }, [ad?.id, ad?.voiceUrl, ad?.combo.platform]);

  useEffect(() => {
    return () => {
      bedHandle.current?.stop();
    };
  }, []);

  if (!ad || !brief) return null;
  const current = ad;
  const product = brief;

  const scriptText = ad.beats
    .map((beat) => `${beat.start}–${beat.end}s · ${beat.label}\n${beat.line}\n(${beat.visual})`)
    .join("\n\n");
  const spoken = ad.beats.map((beat) => beat.line).join(" ").slice(0, 800);
  const singlePack = packMarkdown(brief, [ad], creator);
  const lints = lintAd(ad);
  const landing = landingBlock(brief, ad);
  const assigned = creators?.find((item) => item.id === ad.assignedCreatorId) ?? creator;
  const kit = peekKit();
  const shownPrice = displayPrice(brief.price, kit.priceLocale);
  const load = shotLoad(ad);
  const rates = assigned ? rateCard(assigned, 1) : null;
  const fatigue = fatigueNote(ad);
  const utm = utmFor(brief, ad);

  async function onRewrite(style: RewriteStyle) {
    setBusy(style);
    try {
      const result = await rewriteAdCopy({
        data: {
          style,
          hook: current.hook,
          beats: current.beats,
          caption: current.caption,
          metaPrimary: current.metaPrimary,
          onScreenText: current.onScreenText,
          brief: {
            name: product.name,
            price: product.price,
            claims: product.claims,
            proof: product.proof,
            cta: product.cta,
          },
        },
      });
      if (!result.ok) {
        toast.message(result.error);
        return;
      }
      onChange(decorateAd(applyRewrite(current, result), product));
      toast.message(`Rewritten — ${style.replace("-", " ")}`);
    } catch {
      toast.message("Rewrite failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onStill() {
    setBusy("still");
    try {
      const result = await generateStill({ data: { prompt: current.imagePrompt } });
      if (!result.ok) {
        toast.message(result.error);
        return;
      }
      onChange({ ...current, stillUrl: result.url });
      toast.message("Still on the press");
    } catch {
      toast.message("Still failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onVoice() {
    setBusy("voice");
    try {
      const result = await speakScript({ data: { text: spoken } });
      if (!result.ok) {
        toast.message(result.error);
        return;
      }
      setAudioUrl(result.dataUrl);
      onChange({ ...current, voiceUrl: result.dataUrl });
      toast.message("Eve voice take ready — plays under the sequence");
      bedHandle.current?.duck(true);
    } catch {
      toast.message("Voice failed.");
    } finally {
      setBusy(null);
    }
  }

  function toggleBed() {
    if (bedOn) {
      bedHandle.current?.stop();
      bedHandle.current = null;
      setBedOn(false);
      return;
    }
    const handle = startBed();
    if (!handle) {
      toast.message("Bed needs a browser audio context.");
      return;
    }
    bedHandle.current = handle;
    if (audioUrl) handle.duck(true);
    setBedOn(true);
    toast.message("Licensed-safe bed on — ducked under Eve");
  }

  async function onBurn() {
    const src = current.videoUrl ?? current.shotClips?.[0]?.url;
    if (!src) {
      toast.message("Generate video first, then burn captions.");
      return;
    }
    setBusy("burn");
    try {
      const url = await burnCaptions(current, src);
      onChange({ ...current, burnedCaptionUrl: url });
      toast.message("Captioned copy downloaded");
    } catch {
      toast.message("Could not burn captions from that clip (CORS). Overlay stays for preview.");
    } finally {
      setBusy(null);
    }
  }

  async function onThumbs() {
    const src = current.videoUrl ?? current.shotClips?.[0]?.url;
    if (!src) {
      toast.message("Generate video first, then pick a thumbnail.");
      return;
    }
    setBusy("thumbs");
    try {
      const thumbs = await pickThumbnails(src);
      onChange({ ...current, thumb9x16: thumbs.nine, thumb1x1: thumbs.square });
      toast.message("Thumbnails ready — 9:16 and 1:1");
    } catch {
      toast.message("Could not grab frames from that clip.");
    } finally {
      setBusy(null);
    }
  }

  async function onBundle() {
    const clips = current.shotClips ?? [];
    if (clips.length < 2 && !current.videoUrl) {
      toast.message("Generate a sequence first, then bundle it into one file.");
      return;
    }
    setBusy("bundle");
    try {
      const srcs =
        clips.length > 1
          ? clips.map((clip) => ({ url: clip.url, label: clip.label }))
          : [{ url: current.videoUrl!, label: "Hook" }];
      const url = await stitchClips(srcs, `ad-${String(current.number).padStart(4, "0")}-bundle.webm`);
      onChange({ ...current, bundleUrl: url, videoUrl: url });
      toast.message("Bundled into one 9:16 video");
    } catch {
      toast.message("Could not stitch those clips (CORS). Preview still plays in sequence.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Dialog
        open={!!ad && !prompter}
        onOpenChange={(open) => {
          if (!open && !prompter) onClose();
        }}
      >
        <DialogContent>
          <div className="overflow-y-auto max-h-[min(88dvh,900px)]">
            <DialogHeader>
              <p className="font-mono text-xs tracking-widest text-stamp">
                № {padNum(ad.number)}
                {ad.pairId ? " · A/B pair" : ""}
                {ad.abArm ? ` · ${ad.abArm === "beta" ? "β" : "α"}` : ""}
                {ad.winner ? " · Winner" : ""}
                {ad.offer && ad.offer !== "none" ? ` · ${offerLabel(ad.offer)}` : ""}
              </p>
              <DialogTitle className="italic">{ad.hook}</DialogTitle>
              <DialogDescription>
                {ad.formatLabel} · {ad.personaLabel} · {ad.platformLabel} ·{" "}
                {ad.combo.duration}s · {ad.hookScore?.value ?? "—"}{" "}
                {ad.hookScore?.label ?? ""}
              </DialogDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="stamp">{ad.hookLabel}</Badge>
                <CopyButton text={singlePack} label="Copy this ad" variant="ink" />
                <Button size="sm" variant="quiet" onClick={onChallenger}>
                  Mint challenger
                </Button>
                <Button
                  size="sm"
                  variant={ad.winner ? "ink" : "quiet"}
                  onClick={() => onChange({ ...ad, winner: !ad.winner })}
                >
                  {ad.winner ? "Winner" : "Mark winner"}
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6 px-6 pb-8">
              <div className="flex flex-wrap gap-2">
                {STYLES.map((style) => (
                  <Button
                    key={style.id}
                    size="sm"
                    variant="quiet"
                    disabled={!!busy}
                    onClick={() => void onRewrite(style.id)}
                  >
                    {busy === style.id ? <LoaderCircle className="animate-spin" /> : null}
                    {style.label}
                  </Button>
                ))}
                <Button size="sm" variant="quiet" disabled={!!busy} onClick={() => void onStill()}>
                  {busy === "still" ? <LoaderCircle className="animate-spin" /> : null}
                  Generate still
                </Button>
                <Button size="sm" variant="quiet" disabled={!!busy} onClick={() => void onVoice()}>
                  {busy === "voice" ? <LoaderCircle className="animate-spin" /> : null}
                  Eve voice
                </Button>
                <Button
                  size="sm"
                  variant="ink"
                  disabled={!!busy || videoBusy}
                  onClick={onVideo}
                >
                  {videoBusy ? <LoaderCircle className="animate-spin" /> : null}
                  {ad.videoUrl ? "Remake video" : "Generate video"}
                </Button>
                <Button
                  size="sm"
                  variant="paper"
                  disabled={!!busy || videoBusy}
                  onClick={onSequence}
                >
                  {videoBusy ? <LoaderCircle className="animate-spin" /> : null}
                  Generate {ad.combo.duration}s sequence
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={!!busy || (!(ad.shotClips && ad.shotClips.length > 1) && !ad.videoUrl)}
                  onClick={() => void onBundle()}
                >
                  {busy === "bundle" ? <LoaderCircle className="animate-spin" /> : null}
                  Bundle into one video
                </Button>
                <Button size="sm" variant="quiet" onClick={() => setPrompter(true)}>
                  Teleprompter
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => printCallSheet(brief, [ad], assigned)}
                >
                  Call sheet
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => printTalentBrief(brief, ad, assigned)}
                >
                  Talent brief
                </Button>
              </div>

              {ad.hookScore ? (
                <p className="text-sm text-ink-muted">
                  Hook {ad.hookScore.value} {ad.hookScore.label} — {ad.hookScore.reasons.join(". ")}.
                </p>
              ) : null}

              {fatigue ? (
                <p className="text-sm text-stamp" role="status">
                  {fatigue}
                </p>
              ) : null}

              {ad.claims && !ad.claims.ok ? (
                <p className="text-sm text-stamp" role="status">
                  Claims locker: {ad.claims.flags.join(". ")}.
                </p>
              ) : (
                <p className="text-sm text-ink-muted">Claims locker: numbers match the brief.</p>
              )}

              {ad.policy?.flags.length ? (
                <ul className="space-y-1 text-sm">
                  {ad.policy.flags.map((flag) => (
                    <li
                      key={flag.id}
                      className={flag.severity === "block" ? "text-stamp" : "text-ink-muted"}
                    >
                      {flag.severity === "block" ? "Block" : "Warn"} · {flag.label} — {flag.detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">
                  Policy lint: no health, income, or guarantee flags.
                </p>
              )}

              {pair ? (
                <div className="rounded-lg bg-paper-2 p-3">
                  <p className="text-xs font-medium tracking-widest text-ink-muted uppercase">
                    A/B pair
                  </p>
                  <p className="mt-2 text-sm italic text-ink">{pair.hook}</p>
                  <Button
                    size="sm"
                    variant="quiet"
                    className="mt-2"
                    onClick={onOpenPair}
                  >
                    Open pair
                  </Button>
                </div>
              ) : null}

              {brief.claimSources?.length ? (
                <Section title="Claims locker · tap a number">
                  <ul className="space-y-2 text-sm">
                    {brief.claimSources.map((item) => (
                      <li key={item.claim} className="rounded-lg bg-paper-2 p-3">
                        <p className="text-ink">{item.claim}</p>
                        <p className="mt-1 text-xs text-ink-muted">{item.source}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : ad.claims?.flags.length ? (
                <p className="text-xs text-ink-muted">
                  {ad.claims.flags
                    .map((flag) => sourceForClaim(brief, flag)?.source)
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-ink-muted">
                  CTR
                  <Input
                    value={ad.ctr ?? ""}
                    onChange={(event) => onChange({ ...ad, ctr: event.target.value })}
                    placeholder="1.8%"
                    className="h-11 border-transparent bg-paper-2 text-ink"
                  />
                </label>
                <label className="grid gap-1 text-xs text-ink-muted">
                  CPA
                  <Input
                    value={ad.cpa ?? ""}
                    onChange={(event) => onChange({ ...ad, cpa: event.target.value })}
                    placeholder="$18"
                    className="h-11 border-transparent bg-paper-2 text-ink"
                  />
                </label>
                <label className="grid gap-1 text-xs text-ink-muted">
                  Thumb-stop
                  <Input
                    value={ad.thumbStop ?? ""}
                    onChange={(event) => onChange({ ...ad, thumbStop: event.target.value })}
                    placeholder="32%"
                    className="h-11 border-transparent bg-paper-2 text-ink"
                  />
                </label>
                <label className="grid gap-1 text-xs text-ink-muted">
                  Assign creator
                  <select
                    value={ad.assignedCreatorId ?? ""}
                    onChange={(event) => onAssign(event.target.value || null)}
                    className="h-11 rounded-md border-transparent bg-paper-2 px-3 text-sm text-ink"
                  >
                    <option value="">Unassigned</option>
                    {(creators ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-ink-muted">
                  Spark / code
                  <Input
                    value={ad.sparkCode ?? ""}
                    onChange={(event) => onChange({ ...ad, sparkCode: event.target.value })}
                    placeholder="Paste-back Spark or ad code"
                    className="h-11 border-transparent bg-paper-2 text-ink"
                  />
                </label>
                <label className="grid gap-1 text-xs text-ink-muted">
                  Legal queue
                  <select
                    value={ad.legalStamp ?? "none"}
                    onChange={(event) =>
                      onChange({ ...ad, legalStamp: event.target.value as LegalStamp })
                    }
                    className="h-11 rounded-md border-transparent bg-paper-2 px-3 text-sm text-ink"
                  >
                    <option value="none">Clear</option>
                    <option value="warn">Warn</option>
                    <option value="block">Block</option>
                    <option value="signed-off">Signed off</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-xs text-ink-muted">
                UTM + landing
                <Input
                  value={ad.utm ?? utm}
                  onChange={(event) => onChange({ ...ad, utm: event.target.value })}
                  className="h-11 border-transparent bg-paper-2 text-ink"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                {lints.map((lint) => (
                  <p
                    key={lint.field}
                    className={`font-mono text-xs ${lint.ok ? "text-ink-muted" : "text-stamp"}`}
                  >
                    {lint.field}: {lint.hint}
                  </p>
                ))}
              </div>

              {audioUrl ? (
                <audio controls src={audioUrl} className="w-full">
                  Eve voice take
                </audio>
              ) : null}

              {videoBusy ? (
                <p className="text-sm text-ink-muted" role="status">
                  {renderNote ||
                    "Rendering a 9:16 UGC video in global English. Stays on this ad when it lands."}
                </p>
              ) : null}

              {ad.videoUrl || ad.shotClips?.length ? (
                <>
                  <AssemblyPlayer ad={ad} brief={brief} voiceUrl={audioUrl} bedOn={bedOn} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={!!busy}
                      onClick={() => void onBurn()}
                    >
                      {busy === "burn" ? "Burning captions" : "Download captioned copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={!!busy}
                      onClick={() => void onThumbs()}
                    >
                      {busy === "thumbs" ? "Grabbing frames" : "Thumbnail picker"}
                    </Button>
                    <Button size="sm" variant={bedOn ? "ink" : "quiet"} onClick={toggleBed}>
                      {bedOn ? "Bed on" : "Licensed-safe bed"}
                    </Button>
                  </div>
                  {ad.thumb9x16 || ad.thumb1x1 ? (
                    <div className="flex gap-2">
                      {ad.thumb9x16 ? (
                        <button
                          type="button"
                          onClick={() => downloadDataUrl(ad.thumb9x16!, `ad-${padNum(ad.number)}-9x16.jpg`)}
                          className="h-28 w-16 overflow-hidden rounded-md"
                        >
                          <img src={ad.thumb9x16} alt="9:16 thumbnail" className="size-full object-cover" />
                        </button>
                      ) : null}
                      {ad.thumb1x1 ? (
                        <button
                          type="button"
                          onClick={() => downloadDataUrl(ad.thumb1x1!, `ad-${padNum(ad.number)}-1x1.jpg`)}
                          className="size-28 overflow-hidden rounded-md"
                        >
                          <img src={ad.thumb1x1} alt="1:1 thumbnail" className="size-full object-cover" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <SafeZonePreview
                    ad={ad}
                    platform={previewPlatform}
                    onPlatform={setPreviewPlatform}
                  />
                </>
              ) : (
                <SafeZonePreview
                  ad={ad}
                  platform={previewPlatform}
                  onPlatform={setPreviewPlatform}
                />
              )}

              {brief.pageImages?.length ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
                    Lock a page still · image-to-video
                  </h3>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {brief.pageImages.slice(0, 8).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => {
                          onChange({ ...ad, stillUrl: src, cutawayUrl: src });
                          toast.message("Still locked for the next clip and cutaway");
                        }}
                        className={`h-20 w-16 shrink-0 overflow-hidden rounded-md outline outline-1 -outline-offset-1 ${
                          ad.stillUrl === src ? "outline-stamp" : "outline-ink/10"
                        }`}
                      >
                        <img
                          src={src}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                          onError={(event) => {
                            const node = event.currentTarget.closest("button");
                            if (node) node.hidden = true;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {ad.webcamUrl ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
                    Webcam take · reference, not a generated clip
                  </h3>
                  <video
                    src={ad.webcamUrl}
                    controls
                    playsInline
                    className="max-h-64 w-full rounded-lg object-cover"
                  />
                </section>
              ) : null}

              {ad.stillUrl ? (
                <img
                  src={ad.stillUrl}
                  alt={`UGC still for ${brief.name}`}
                  referrerPolicy="no-referrer"
                  className="max-h-52 w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-ink/10"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              ) : null}

              <Filmstrip ad={ad} />

              <section>
                <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
                  Storyboard
                </h3>
                <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
                  {ad.shotList.map((shot) => (
                    <article
                      key={`${shot.start}-${shot.frame}`}
                      className="flex h-72 w-40 shrink-0 flex-col rounded-lg bg-paper-2 p-3"
                    >
                      <p className="font-mono text-xs text-ink-muted">
                        {shot.start}–{shot.end}s · 9:16
                      </p>
                      <p className="mt-3 text-sm leading-snug text-ink">{shot.frame}</p>
                      <p className="mt-auto text-xs text-ink-muted">{shot.note}</p>
                    </article>
                  ))}
                </div>
              </section>

              <Section title="Call-sheet checklist">
                <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
                  {CALL_SHEET_CHECKS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {assigned ? (
                  <p className="mt-2 text-xs text-ink-muted">
                    {assigned.name} · {assigned.rights || "paid usage"} · {rates?.line} ·{" "}
                    {load.line} · display price {shownPrice}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">{load.line} · display price {shownPrice}</p>
                )}
              </Section>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="quiet" onClick={() => downloadSrt(ad)}>
                  SRT captions
                </Button>
                <Button size="sm" variant="quiet" onClick={() => downloadVtt(ad)}>
                  VTT captions
                </Button>
                <Button size="sm" variant="quiet" onClick={() => downloadPremiere(ad)}>
                  Premiere markers
                </Button>
                <Button size="sm" variant="quiet" onClick={() => downloadCapCut(ad)}>
                  CapCut chapters
                </Button>
                <Button size="sm" variant="quiet" onClick={() => downloadLanding(brief, ad)}>
                  Landing HTML
                </Button>
                <CopyButton text={landing} label="Copy landing block" variant="quiet" />
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <Section title="Timed script" copy={scriptText}>
                    <ol className="space-y-3">
                      {ad.beats.map((beat) => (
                        <li key={`${beat.start}-${beat.label}`} className="rounded-lg bg-paper-2 p-3">
                          <p className="font-mono text-xs text-ink-muted">
                            {beat.start}–{beat.end}s · {beat.label}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink">{beat.line}</p>
                          <p className="mt-1 text-xs text-ink-muted">{beat.visual}</p>
                        </li>
                      ))}
                    </ol>
                  </Section>
                  <Section title="On-screen text" copy={ad.onScreenText.join("\n")}>
                    <ul className="space-y-1 text-sm">
                      {ad.onScreenText.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </Section>
                </div>
                <div className="space-y-6">
                  <Section title="Caption" copy={ad.caption}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{ad.caption}</p>
                    <p className="mt-2 text-sm text-ink-muted">
                      {ad.hashtags.map((tag) => `#${tag}`).join(" ")}
                    </p>
                  </Section>
                  <Section title="Meta primary text" copy={ad.metaPrimary}>
                    <p className="text-sm leading-relaxed">{ad.metaPrimary}</p>
                  </Section>
                  <Section
                    title="Shot list"
                    copy={ad.shotList
                      .map((shot) => `${shot.start}–${shot.end}s ${shot.frame} — ${shot.note}`)
                      .join("\n")}
                  >
                    <ul className="space-y-2 text-sm">
                      {ad.shotList.map((shot) => (
                        <li key={`${shot.start}-${shot.frame}`}>
                          <span className="font-mono text-xs text-ink-muted">
                            {shot.start}–{shot.end}s
                          </span>{" "}
                          {shot.frame}
                          <span className="block text-xs text-ink-muted">{shot.note}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Creator direction" copy={ad.creatorDirection.join("\n")}>
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {ad.creatorDirection.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Image prompt" copy={ad.imagePrompt}>
                    <p className="text-sm leading-relaxed text-ink-muted">{ad.imagePrompt}</p>
                  </Section>
                  <Section title="Producer notes">
                    <Textarea
                      value={ad.note ?? ""}
                      onChange={(event) => onChange({ ...ad, note: event.target.value })}
                      placeholder="Notes for the creator — English"
                      className="min-h-20 border-transparent bg-paper-2 text-ink"
                    />
                  </Section>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {prompter ? (
        <Teleprompter
          ad={ad}
          stillUrl={ad.stillUrl}
          onClose={() => setPrompter(false)}
          onTake={(url) => {
            onChange({ ...ad, webcamUrl: url });
            toast.message("Webcam take attached as reference");
          }}
        />
      ) : null}
    </>
  );
}
