import { Button } from "@/components/ui/button";
import { DAY_LABELS } from "@/lib/factory/desk";
import { offerLabel } from "@/lib/factory/offers";
import type { DropSlot, MintedAd, OfferId, PlatformId } from "@/lib/factory/types";
import { PLATFORM_IDS } from "@/lib/factory/types";
import { padNum } from "@/lib/utils";

export function CalendarView({
  slots,
  ads,
  onChange,
  onFill,
  onOpen,
}: {
  slots: DropSlot[];
  ads: MintedAd[];
  onChange: (slots: DropSlot[]) => void;
  onFill: () => void;
  onOpen: (ad: MintedAd) => void;
}) {
  const keepers = ads.filter((ad) => ad.pinned && !ad.hidden && !ad.killed);
  const pool = keepers.length ? keepers : ads.filter((ad) => !ad.hidden && !ad.killed);

  function patch(day: number, next: Partial<DropSlot>) {
    onChange(slots.map((slot) => (slot.day === day ? { ...slot, ...next } : slot)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Seven-day drop. Which keeper, which platform, which offer. No auto-post.
        </p>
        <Button size="sm" variant="outline" onClick={onFill} disabled={!pool.length}>
          Fill from keepers
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {slots.map((slot) => {
          const ad = ads.find((item) => item.id === slot.adId) ?? null;
          return (
            <article
              key={slot.day}
              className="rounded-xl border border-border bg-bg-elevated p-3"
            >
              <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {DAY_LABELS[slot.day] ?? `Day ${slot.day + 1}`}
              </p>
              <select
                value={slot.adId ?? ""}
                onChange={(event) => patch(slot.day, { adId: event.target.value || null })}
                className="mt-2 h-11 w-full rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg"
              >
                <option value="">Empty</option>
                {pool.map((item) => (
                  <option key={item.id} value={item.id}>
                    № {padNum(item.number)} · {item.platformLabel}
                  </option>
                ))}
              </select>
              <select
                value={slot.platform}
                onChange={(event) =>
                  patch(slot.day, { platform: event.target.value as PlatformId })
                }
                className="mt-2 h-11 w-full rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg"
              >
                {PLATFORM_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <p className="mt-2 truncate text-xs text-fg-muted">
                {ad ? ad.hook : "No keeper"}
              </p>
              {ad ? (
                <button
                  type="button"
                  onClick={() => onOpen(ad)}
                  className="mt-1 text-xs text-steel underline-offset-4 hover:underline"
                >
                  {offerLabel((ad.offer ?? slot.offer) as OfferId)}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
