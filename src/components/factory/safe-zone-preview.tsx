import { SAFE_CHROME } from "@/lib/factory/ship";
import type { MintedAd, PlatformId } from "@/lib/factory/types";
import { cn } from "@/lib/utils";

export function SafeZonePreview({
  ad,
  platform,
  onPlatform,
}: {
  ad: MintedAd;
  platform: PlatformId;
  onPlatform: (id: PlatformId) => void;
}) {
  const chrome = SAFE_CHROME[platform];
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
          Platform safe zone
        </h3>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {(Object.keys(SAFE_CHROME) as PlatformId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPlatform(id)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-xs",
              id === platform
                ? "border-ink bg-ink text-paper"
                : "border-transparent bg-paper-2 text-ink-muted",
            )}
          >
            {SAFE_CHROME[id].label}
          </button>
        ))}
      </div>
      <div
        className="ugc-phone relative mx-auto w-full max-w-[200px] rounded-lg bg-ink"
        style={{ aspectRatio: chrome.aspect }}
      >
        {ad.stillUrl || ad.videoUrl ? (
          ad.videoUrl ? (
            <video
              src={ad.videoUrl}
              muted
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img src={ad.stillUrl} alt="" className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center">
            <p className="font-display text-lg italic text-paper">{ad.hook}</p>
          </div>
        )}
        <div
          className="ugc-chrome-top pointer-events-none absolute inset-x-0 top-0 bg-ink/55"
          style={{ height: chrome.top }}
        />
        <div
          className="ugc-chrome-bottom pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70"
          style={{ height: chrome.bottom }}
        >
          <p className="px-3 pt-2 font-mono text-[10px] tracking-widest text-paper uppercase">
            {chrome.label} UI
          </p>
        </div>
      </div>
      <p className="text-center text-xs text-ink-muted">{chrome.note}</p>
    </section>
  );
}
