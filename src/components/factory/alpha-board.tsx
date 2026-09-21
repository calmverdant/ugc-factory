import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filmstrip } from "@/components/factory/filmstrip";
import { formatExperiments, predictedArm } from "@/lib/factory/alpha";
import type { MintedAd } from "@/lib/factory/types";
import { padNum } from "@/lib/utils";

export function AlphaBoard({
  ads,
  onOpen,
  onWinner,
  onMint,
}: {
  ads: MintedAd[];
  onOpen: (ad: MintedAd) => void;
  onWinner: (ad: MintedAd) => void;
  onMint: () => void;
}) {
  const experiments = formatExperiments(ads);

  if (!experiments.length) {
    return (
      <div className="rounded-xl border border-border bg-bg-elevated px-4 py-8">
        <p className="text-sm text-fg-muted">
          No format alpha/beta tests yet. The swarm runs them automatically after a
          brief — same hook family, two formats, predicted winner.
        </p>
        <Button variant="outline" className="mt-4" onClick={onMint}>
          Run format alpha/beta
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
          Format alpha/beta · {experiments.length} test{experiments.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="outline" onClick={onMint}>
          Mint another test
        </Button>
      </div>
      {experiments.map((pair) => {
        const alpha = pair.find((item) => item.abArm === "alpha") ?? pair[0]!;
        const beta = pair.find((item) => item.abArm === "beta") ?? pair[1] ?? pair[0]!;
        const pick = predictedArm(alpha, beta);
        return (
          <div
            key={alpha.experimentId}
            className="grid gap-3 rounded-xl border border-border bg-bg-elevated p-4 md:grid-cols-2"
          >
            {[alpha, beta].map((ad) => {
              const arm = ad.abArm === "beta" ? "B" : "A";
              const predicted = pick !== "tie" && pick === (ad.abArm ?? "alpha");
              return (
                <article key={ad.id} className="rounded-lg bg-paper p-4 text-ink">
                  <p className="font-mono text-xs tracking-widest text-stamp">
                    {arm} · {padNum(ad.number)} · {ad.hookScore?.value ?? "—"}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpen(ad)}
                    className="mt-2 text-left font-display text-xl italic leading-snug"
                  >
                    {ad.hook}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="paper">{ad.formatLabel}</Badge>
                    <Badge variant="paper">{ad.platformLabel}</Badge>
                    {ad.winner ? <Badge variant="stamp">Winner</Badge> : null}
                    {predicted && !ad.winner ? (
                      <Badge variant="stamp">Predicted</Badge>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Filmstrip ad={ad} compact />
                  </div>
                  <Button
                    size="sm"
                    variant="ink"
                    className="mt-3"
                    onClick={() => onWinner(ad)}
                  >
                    This format wins
                  </Button>
                </article>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
