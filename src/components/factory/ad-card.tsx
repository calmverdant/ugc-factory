import { EyeOff, LoaderCircle, Pin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filmstrip } from "@/components/factory/filmstrip";
import { fatigueNote } from "@/lib/factory/performance";
import type { MintedAd } from "@/lib/factory/types";
import { padNum, cn } from "@/lib/utils";

export function AdCard({
  ad,
  index,
  rendering,
  onOpen,
  onPin,
  onHide,
  onVideo,
}: {
  ad: MintedAd;
  index: number;
  rendering?: boolean;
  onOpen: () => void;
  onPin: () => void;
  onHide: () => void;
  onVideo: () => void;
}) {
  const score = ad.hookScore;
  const shots = ad.shotClips?.length ?? (ad.videoUrl ? 1 : 0);
  const fatigue = fatigueNote(ad);
  return (
    <div
      className={cn(
        "rise-in relative flex min-h-44 flex-col rounded-xl bg-paper p-5 text-left text-ink shadow-paper transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5",
        ad.hidden && "opacity-60",
      )}
      style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-widest text-stamp">
          № {padNum(ad.number)}
          {ad.pairId ? " · A/B" : ""}
          {ad.winner ? " · W" : ""}
        </span>
        <span className="font-mono text-xs text-ink-muted">
          {score ? `${score.value} ${score.label}` : ""} · {ad.combo.duration}s
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 flex-1 text-left focus-visible:outline-none"
      >
        <p className="font-display text-xl leading-snug text-ink italic">{ad.hook}</p>
      </button>

      {ad.videoUrl ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 overflow-hidden rounded-lg bg-ink outline outline-1 -outline-offset-1 outline-ink/10"
          aria-label="Play generated video"
        >
          <video
            src={ad.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="aspect-[9/16] max-h-64 w-full object-cover"
          />
        </button>
      ) : (
        <div className="mt-4">
          <Filmstrip ad={ad} compact />
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
        <Badge variant="paper">{ad.platformLabel}</Badge>
        <Badge variant="paper">{ad.formatLabel}</Badge>
        <Badge variant="paper">{ad.personaLabel}</Badge>
        {ad.claims && !ad.claims.ok ? (
          <Badge variant="stamp">Claims</Badge>
        ) : null}
        {ad.policy && !ad.policy.ok ? (
          <Badge variant="stamp">Policy</Badge>
        ) : null}
        {shots ? (
          <Badge variant="stamp">{shots > 1 ? `${shots} shots` : "Video"}</Badge>
        ) : null}
        {ad.ctr ? <Badge variant="paper">{ad.ctr}</Badge> : null}
        {ad.abArm ? (
          <Badge variant="stamp">{ad.abArm === "beta" ? "β" : "α"}</Badge>
        ) : null}
        {ad.angle ? <Badge variant="paper">{ad.angle}</Badge> : null}
        {ad.sku ? <Badge variant="paper">{ad.sku}</Badge> : null}
        {ad.legalStamp && ad.legalStamp !== "none" ? (
          <Badge variant="stamp">{ad.legalStamp}</Badge>
        ) : null}
        {ad.sparkCode ? <Badge variant="paper">Spark</Badge> : null}
        {fatigue ? <Badge variant="stamp">Fatigue</Badge> : null}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            aria-label={ad.pinned ? "Unpin" : "Pin keeper"}
            onClick={onPin}
            className={cn(
              "flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper-2 hover:text-ink",
              ad.pinned && "text-stamp",
            )}
          >
            <Pin className="size-4" />
          </button>
          <button
            type="button"
            aria-label={ad.hidden ? "Unhide" : "Hide"}
            onClick={onHide}
            className="flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper-2 hover:text-ink"
          >
            <EyeOff className="size-4" />
          </button>
        </div>
      </div>

      <Button
        size="sm"
        variant="ink"
        className="mt-3 w-full"
        disabled={rendering}
        onClick={onVideo}
      >
        {rendering ? <LoaderCircle className="animate-spin" /> : <Video />}
        {rendering
          ? "Rendering video"
          : ad.videoUrl
            ? "Remake video"
            : "Generate video"}
      </Button>
    </div>
  );
}
