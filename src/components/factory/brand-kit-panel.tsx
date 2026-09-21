import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { spellingLabel, priceLocaleLabel } from "@/lib/factory/locale";
import type {
  BrandKit,
  CompetitorRule,
  PriceLocaleId,
  SpellingId,
  WinnerMemory,
} from "@/lib/factory/types";
import { COMPETITOR_RULE_IDS, PRICE_LOCALE_IDS, SPELLING_IDS } from "@/lib/factory/types";

export function BrandKitPanel({
  kit,
  onChange,
  onApply,
  winners,
  onClone,
  onForget,
  productName,
}: {
  kit: BrandKit;
  onChange: (kit: BrandKit) => void;
  onApply: () => void;
  winners: WinnerMemory[];
  onClone: (item: WinnerMemory) => void;
  onForget: (id: string) => void;
  productName?: string;
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-border bg-bg-elevated p-4">
        <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
          Brand kit · survives New
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Banned words, must-say lines, competitor rule, English spelling, price
          locale. Applied at mint. Roster stays with the press.
        </p>
        <label className="mt-4 grid gap-1 text-xs text-fg-subtle">
          Banned words (one per line)
          <Textarea
            value={kit.banned.join("\n")}
            onChange={(event) =>
              onChange({
                ...kit,
                banned: event.target.value.split("\n").map((line) => line.trim()),
              })
            }
            className="min-h-24 bg-bg-subtle"
            placeholder={"miracle\nguaranteed"}
          />
        </label>
        <label className="mt-3 grid gap-1 text-xs text-fg-subtle">
          Must-say (one per line)
          <Textarea
            value={kit.mustSay.join("\n")}
            onChange={(event) =>
              onChange({
                ...kit,
                mustSay: event.target.value.split("\n").map((line) => line.trim()),
              })
            }
            className="min-h-20 bg-bg-subtle"
            placeholder="Always name the unit."
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-fg-subtle">
            Spelling
            <select
              value={kit.spelling}
              onChange={(event) =>
                onChange({ ...kit, spelling: event.target.value as SpellingId })
              }
              className="h-11 rounded-md border border-border bg-bg-subtle px-3 text-sm text-fg"
            >
              {SPELLING_IDS.map((id) => (
                <option key={id} value={id}>
                  {spellingLabel(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-fg-subtle">
            Price locale
            <select
              value={kit.priceLocale}
              onChange={(event) =>
                onChange({ ...kit, priceLocale: event.target.value as PriceLocaleId })
              }
              className="h-11 rounded-md border border-border bg-bg-subtle px-3 text-sm text-fg"
            >
              {PRICE_LOCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {priceLocaleLabel(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-fg-subtle">
            Competitor
            <select
              value={kit.competitorRule}
              onChange={(event) =>
                onChange({ ...kit, competitorRule: event.target.value as CompetitorRule })
              }
              className="h-11 rounded-md border border-border bg-bg-subtle px-3 text-sm text-fg"
            >
              {COMPETITOR_RULE_IDS.map((id) => (
                <option key={id} value={id}>
                  {id === "name-them"
                    ? "Name them"
                    : id === "dont-mock"
                      ? "Don't mock"
                      : "Category only"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1 text-xs text-fg-subtle">
          Voice samples (one per line, up to 3)
          <Textarea
            value={kit.voiceSamples.join("\n")}
            onChange={(event) =>
              onChange({
                ...kit,
                voiceSamples: event.target.value.split("\n").map((line) => line.trim()).slice(0, 3),
              })
            }
            className="min-h-20 bg-bg-subtle"
          />
        </label>
        <Button className="mt-4" variant="paper" onClick={onApply}>
          Apply kit to this shelf
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-bg-elevated p-4">
        <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
          Winner library
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Hook families that won on another SKU. Clone format + hook + persona;
          product lines swap.
        </p>
        {winners.length === 0 ? (
          <p className="mt-3 text-sm text-fg-subtle">
            Mark a winner on the A/B board to remember it.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {winners.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-bg-subtle p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm italic text-fg">{item.hook}</p>
                  <p className="text-xs text-fg-subtle">
                    {item.product} · {item.hookFamily} · {item.format}
                    {productName && item.product !== productName
                      ? ` — try it on ${productName}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onClone(item)}>
                    Clone onto this brief
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onForget(item.id)}>
                    Forget
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


