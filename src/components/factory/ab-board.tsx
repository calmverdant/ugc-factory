import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MintedAd } from "@/lib/factory/types";
import { padNum } from "@/lib/utils";

function groups(ads: MintedAd[]): MintedAd[][] {
  const map = new Map<string, MintedAd[]>();
  for (const ad of ads) {
    if (!ad.pairId || ad.hidden || ad.killed) continue;
    const list = map.get(ad.pairId) ?? [];
    list.push(ad);
    map.set(ad.pairId, list);
  }
  return [...map.values()].filter((list) => list.length >= 1);
}

export function AbBoard({
  ads,
  onOpen,
  onWinner,
  onCtr,
  onChallenger,
}: {
  ads: MintedAd[];
  onOpen: (ad: MintedAd) => void;
  onWinner: (ad: MintedAd) => void;
  onCtr: (ad: MintedAd, ctr: string) => void;
  onChallenger: (ad: MintedAd) => void;
}) {
  const pairs = groups(ads);

  if (!pairs.length) {
    return (
      <p className="rounded-xl border border-border bg-bg-elevated px-4 py-8 text-sm text-fg-muted">
        No A/B pairs yet. Open an ad and mint a challenger — same format, new hook.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {pairs.map((pair) => (
        <div
          key={pair[0]?.pairId}
          className="grid gap-3 rounded-xl border border-border bg-bg-elevated p-4 md:grid-cols-2"
        >
          {pair.slice(0, 2).map((ad) => (
            <article key={ad.id} className="rounded-lg bg-paper p-4 text-ink">
              <p className="font-mono text-xs tracking-widest text-stamp">
                № {padNum(ad.number)} · {ad.hookScore?.value ?? "—"}{" "}
                {ad.hookScore?.label ?? ""}
              </p>
              <button
                type="button"
                onClick={() => onOpen(ad)}
                className="mt-2 text-left font-display text-xl italic leading-snug"
              >
                {ad.hook}
              </button>
              {ad.stillUrl ? (
                <img
                  src={ad.stillUrl}
                  alt=""
                  className="mt-3 h-28 w-full rounded-md object-cover"
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="paper">{ad.platformLabel}</Badge>
                <Badge variant="paper">{ad.hookLabel}</Badge>
                {ad.winner ? <Badge variant="stamp">Winner</Badge> : null}
                {(ad.abLosses ?? 0) > 0 ? (
                  <Badge variant="stamp">{ad.abLosses} loss{ad.abLosses === 1 ? "" : "es"}</Badge>
                ) : null}
              </div>
              <label className="mt-3 grid gap-1 text-xs text-ink-muted">
                CTR later
                <Input
                  value={ad.ctr ?? ""}
                  onChange={(event) => onCtr(ad, event.target.value)}
                  placeholder="1.8%"
                  className="h-11 border-transparent bg-paper-2 text-ink"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="ink" onClick={() => onWinner(ad)}>
                  {ad.winner ? "Winner" : "Pick winner"}
                </Button>
                <Button size="sm" variant="quiet" onClick={() => onChallenger(ad)}>
                  Mint challenger
                </Button>
              </div>
            </article>
          ))}
          {pair.length === 1 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-4 text-sm text-fg-muted">
              One hook, one thumbnail. Mint a challenger to pair it.
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
