import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fatigueNote } from "@/lib/factory/performance";
import type { MintedAd } from "@/lib/factory/types";
import { padNum } from "@/lib/utils";

export function OpensBoard({
  ads,
  onPick,
  onMintOpens,
  onOpen,
}: {
  ads: MintedAd[];
  onPick: (ad: MintedAd, hook: string) => void;
  onMintOpens: (ad: MintedAd) => void;
  onOpen: (ad: MintedAd) => void;
}) {
  const rows = ads.filter((ad) => !ad.hidden && !ad.killed).slice(0, 12);

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-border bg-bg-elevated px-4 py-8 text-sm text-fg-muted">
        Mint ads first. The opens board holds three alternate first-three-seconds
        hooks against the same body.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((ad) => {
        const fatigue = fatigueNote(ad);
        const alts = (ad.altHooks ?? []).slice(0, 3);
        return (
          <article
            key={ad.id}
            className="rounded-xl border border-border bg-bg-elevated p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs tracking-widest text-stamp uppercase">
                  № {padNum(ad.number)} · first 3 seconds
                </p>
                <button
                  type="button"
                  onClick={() => onOpen(ad)}
                  className="mt-1 text-left font-display text-xl italic leading-snug text-fg"
                >
                  {ad.hook}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{ad.platformLabel}</Badge>
                <Badge>{ad.hookLabel}</Badge>
                {ad.hookScore ? (
                  <Badge variant="steel">
                    {ad.hookScore.value} {ad.hookScore.label}
                  </Badge>
                ) : null}
              </div>
            </div>
            {fatigue ? (
              <p className="mt-2 text-sm text-stamp" role="status">
                {fatigue}
              </p>
            ) : null}
            <p className="mt-3 text-xs tracking-widest text-fg-subtle uppercase">
              Same body · pick the hold
            </p>
            <div className="mt-2 grid gap-2">
              {alts.map((hook) => (
                <button
                  key={hook}
                  type="button"
                  onClick={() => onPick(ad, hook)}
                  className="rounded-lg border border-border bg-bg-subtle px-3 py-3 text-left text-sm text-fg hover:border-border-strong"
                >
                  {hook}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onMintOpens(ad)}
            >
              Mint 3 opens as an A/B
            </Button>
          </article>
        );
      })}
    </div>
  );
}
