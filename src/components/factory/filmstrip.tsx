import type { MintedAd } from "@/lib/factory/types";
import { cn } from "@/lib/utils";

/** Always-on 9:16 beat visualization — no generated clip required. */
export function Filmstrip({
  ad,
  compact,
}: {
  ad: MintedAd;
  compact?: boolean;
}) {
  const frames = ad.beats.length ? ad.beats : [];
  if (!frames.length) return null;

  return (
    <section className="space-y-2">
      {!compact ? (
        <h3 className="text-xs font-medium tracking-widest text-ink-muted uppercase">
          Content visualization · {ad.combo.duration}s · 9:16
        </h3>
      ) : null}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {frames.map((beat, i) => (
          <article
            key={`${beat.start}-${beat.label}-${i}`}
            className={cn(
              "relative flex shrink-0 flex-col overflow-hidden rounded-lg bg-ink text-paper",
              compact ? "h-36 w-20" : "h-64 w-36",
            )}
          >
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  i % 3 === 0
                    ? "linear-gradient(180deg, color-mix(in oklab, var(--color-steel) 35%, transparent), transparent 70%)"
                    : i % 3 === 1
                      ? "linear-gradient(160deg, color-mix(in oklab, var(--color-stamp) 28%, transparent), transparent 65%)"
                      : "linear-gradient(200deg, color-mix(in oklab, var(--color-paper) 18%, transparent), transparent 70%)",
              }}
            />
            <p className="relative z-10 px-2 pt-2 font-mono text-[10px] tracking-widest text-steel uppercase">
              {beat.start}–{beat.end}s · {beat.label}
            </p>
            <p
              className={cn(
                "relative z-10 mt-auto px-2 font-display italic leading-snug",
                compact ? "pb-2 text-xs" : "pb-2 text-sm",
              )}
            >
              {beat.line}
            </p>
            {!compact ? (
              <p className="relative z-10 line-clamp-2 px-2 pb-3 text-[10px] text-fg-muted">
                {beat.visual}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
