import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { captionAt, endCardLines, safeZoneBottom, safeZoneNote } from "@/lib/factory/captions";
import { productCutaway } from "@/lib/factory/assets";
import type { MintedAd, ProductBrief, ShotClip } from "@/lib/factory/types";

function clipsFor(ad: MintedAd): ShotClip[] {
  if (ad.bundleUrl) {
    return [
      {
        label: "Bundled",
        url: ad.bundleUrl,
        start: 0,
        end: ad.combo.duration,
      },
    ];
  }
  if (ad.shotClips?.length) return ad.shotClips;
  if (ad.videoUrl) {
    return [{ label: "Hook", url: ad.videoUrl, start: 0, end: 6 }];
  }
  return [];
}

export function AssemblyPlayer({
  ad,
  brief,
  voiceUrl,
  bedOn,
}: {
  ad: MintedAd;
  brief: ProductBrief;
  voiceUrl?: string | null;
  bedOn?: boolean;
}) {
  const clips = useMemo(() => clipsFor(ad), [ad]);
  const [idx, setIdx] = useState(0);
  const [local, setLocal] = useState(0);
  const [ended, setEnded] = useState(false);
  const [cutaway, setCutaway] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const insert = productCutaway(ad, brief);

  useEffect(() => {
    setIdx(0);
    setLocal(0);
    setEnded(false);
    setCutaway(false);
  }, [ad.id, clips.map((clip) => clip.url).join("|")]);

  if (!clips.length) return null;

  const clip = clips[Math.min(idx, clips.length - 1)]!;
  const timeline = clip.start + local;
  const caption = captionAt(ad, timeline);
  const pad = safeZoneBottom(ad.combo.platform);
  const card = ad.endCard
    ? ad.endCard.split(" · ")
    : endCardLines(brief, ad);
  const sequenced = clips.length > 1;

  function onTime(event: SyntheticEvent<HTMLVideoElement>) {
    setLocal(event.currentTarget.currentTime);
  }

  function onEnded() {
    if (idx + 1 < clips.length) {
      if (insert) {
        setCutaway(true);
        window.setTimeout(() => {
          setCutaway(false);
          setIdx((n) => n + 1);
          setLocal(0);
        }, 700);
        return;
      }
      setIdx((n) => n + 1);
      setLocal(0);
      return;
    }
    setEnded(true);
    audioRef.current?.pause();
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
          {ad.bundleUrl
            ? "Single bundled 9:16 file"
            : sequenced
              ? `Sequence · ${clips.length} shots`
              : "UGC video · 9:16"}
          {bedOn ? " · bed" : ""}
        </h3>
        <a
          href={clip.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ink-muted underline-offset-4 hover:underline"
        >
          Open clip
        </a>
      </div>
      <div className="ugc-phone mx-auto w-full max-w-[220px] rounded-lg">
        {cutaway && insert ? (
          <img
            src={insert}
            alt=""
            referrerPolicy="no-referrer"
            className="aspect-[9/16] w-full object-cover"
          />
        ) : (
          <video
            key={clip.url}
            ref={videoRef}
            src={clip.url}
            controls
            playsInline
            autoPlay={idx > 0}
            preload="metadata"
            onTimeUpdate={onTime}
            onEnded={onEnded}
            onPlay={() => {
              if (voiceUrl && idx === 0) void audioRef.current?.play().catch(() => undefined);
            }}
            onPause={() => audioRef.current?.pause()}
            className="aspect-[9/16] w-full object-cover"
          >
            UGC clip
          </video>
        )}
        {cutaway ? (
          <p className="ugc-caption" style={{ bottom: pad }}>
            Product insert
          </p>
        ) : !ended ? (
          <p className="ugc-caption" style={{ bottom: pad }}>
            {caption}
          </p>
        ) : (
          <div className="ugc-endcard" style={{ paddingBottom: pad }}>
            <strong>{card[0]}</strong>
            {card[1] ? <span>{card[1]}</span> : null}
            {card[2] ? <span>{card[2]}</span> : null}
          </div>
        )}
      </div>
      {sequenced ? (
        <div className="flex justify-center gap-1.5">
          {clips.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              aria-label={item.label}
              onClick={() => {
                setIdx(i);
                setLocal(0);
                setEnded(false);
                setCutaway(false);
              }}
              className={`h-2 w-6 rounded-full ${
                i === idx && !ended ? "bg-ink" : "bg-paper-2"
              }`}
            />
          ))}
        </div>
      ) : null}
      <p className="text-center font-mono text-xs text-ink-muted">
        {cutaway ? "Cutaway" : clip.label} · {Math.floor(timeline)}s · {safeZoneNote(ad.combo.platform)}
      </p>
      <p className="text-center text-xs text-ink-muted">
        Captions overlay in English for hard-of-hearing. End card sits in the
        safe zone. Download a burned copy if you need it in the file.
      </p>
      {voiceUrl ? (
        <audio ref={audioRef} src={voiceUrl} className="hidden">
          Eve voice take
        </audio>
      ) : null}
    </section>
  );
}
