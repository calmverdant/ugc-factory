import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PERSONAS } from "@/lib/factory/catalog";
import { assetKindLabel, hostOf } from "@/lib/factory/assets";
import { sanitizeBrief } from "@/lib/factory/english";
import { displayPrice } from "@/lib/factory/locale";
import { peekKit } from "@/lib/factory/kit";
import { rateCard } from "@/lib/factory/desk";
import type { Creator, PageAsset, PersonaId, ProductBrief, ScrapeReport } from "@/lib/factory/types";
import { DEFAULT_USAGE } from "@/lib/factory/types";
import { cn } from "@/lib/utils";

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs tracking-widest text-fg-subtle uppercase">{label}</span>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-20 bg-bg-subtle"
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 bg-bg-subtle text-sm"
        />
      )}
    </label>
  );
}

function PageStills({
  assets,
  onLock,
}: {
  assets: PageAsset[];
  onLock: (url: string) => void;
}) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  const live = assets.filter((item) => !failed[item.url]).slice(0, 8);
  if (!live.length) return null;

  return (
    <div>
      <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
        Page assets · lock for image-to-video
      </p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {live.map((item) => (
          <div key={item.url} className="w-16 shrink-0">
            <button
              type="button"
              onClick={() => onLock(item.url)}
              aria-label={`Lock ${item.kind} still for image-to-video`}
              className="h-20 w-16 overflow-hidden rounded-md border border-border bg-bg-subtle"
            >
              <img
                src={item.url}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                className="size-full object-cover"
                onError={() => setFailed((prev) => ({ ...prev, [item.url]: true }))}
              />
            </button>
            <p className="mt-1 truncate text-center text-xs text-fg-subtle">
              {assetKindLabel(item.kind)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


const ENGINE_LABEL: Record<string, string> = {
  firecrawl: "Firecrawl",
  direct: "Direct page",
  jina: "Reader",
  none: "No scrape",
};

export function ScrapeCard({
  report,
  running,
}: {
  report?: ScrapeReport | null;
  running?: boolean;
}) {
  if (!running && !report) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4">
      <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
        {running ? "Scrape in progress" : "Page scrape"}
      </p>
      {running ? (
        <p className="mt-2 text-sm text-fg-muted">
          Firecrawl is reading the page. Brief writer and rival scout run as soon as
          the markdown lands.
        </p>
      ) : report ? (
        <>
          <p className="mt-2 text-sm text-fg">
            {report.title || report.host}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {ENGINE_LABEL[report.engine] ?? report.engine}
            {" · "}
            {report.chars.toLocaleString()} chars
            {" · "}
            {report.assets} assets
            {report.jsonLd ? " · JSON-LD" : ""}
          </p>
          {report.notes.length ? (
            <ul className="mt-2 space-y-1">
              {report.notes.map((note) => (
                <li key={note} className="text-xs text-fg-muted">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function BriefRail({
  brief,
  onChange,
  onReset,
  onRemint,
  onPullCompetitor,
  onLockStill,
  pullingRival,
  creators,
  activeCreatorId,
  onSaveCreator,
  onSelectCreator,
  onDeleteCreator,
  className,
}: {
  brief: ProductBrief;
  onChange: (brief: ProductBrief) => void;
  onReset: () => void;
  onRemint: () => void;
  onPullCompetitor: (url: string) => void;
  onLockStill: (url: string) => void;
  pullingRival?: boolean;
  creators: Creator[];
  activeCreatorId: string | null;
  onSaveCreator: (creator: Omit<Creator, "id">) => void;
  onSelectCreator: (id: string | null) => void;
  onDeleteCreator: (id: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brief);
  const [creatorName, setCreatorName] = useState("");
  const [creatorRate, setCreatorRate] = useState("");
  const [creatorPersona, setCreatorPersona] = useState<PersonaId>("creator");

  function startEdit() {
    setDraft(brief);
    setEditing(true);
  }

  function saveEdit() {
    onChange(
      sanitizeBrief({
        ...draft,
        claims: draft.claims.map((item) => item.trim()).filter(Boolean),
        proof: draft.proof.map((item) => item.trim()).filter(Boolean),
        skus: (draft.skus ?? []).map((item) => item.trim()).filter(Boolean),
        voiceSamples: (draft.voiceSamples ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3),
      }),
    );
    setEditing(false);
  }

  const shown = editing ? draft : brief;
  const kit = peekKit();
  const price = displayPrice(shown.price, kit.priceLocale);

  return (
    <aside
      className={cn(
        "flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-bg-elevated p-5 md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
            Product brief · English · Global
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-fg">
            {shown.name}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {shown.brand} · {shown.category} · {price}
          </p>
          {shown.url ? (
            <p className="mt-1 truncate text-xs text-fg-subtle">
              Scraped {hostOf(shown.url)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {editing ? (
            <Button size="sm" variant="paper" onClick={saveEdit}>
              Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onReset}>
            New
          </Button>
        </div>
      </div>

      {brief.scrape ? <ScrapeCard report={brief.scrape} /> : null}

      {editing ? (
        <div className="grid gap-3">
          <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Field label="Brand" value={draft.brand} onChange={(brand) => setDraft({ ...draft, brand })} />
          <Field
            label="Category"
            value={draft.category}
            onChange={(category) => setDraft({ ...draft, category })}
          />
          <Field
            label="Price ($ / € / £)"
            value={draft.price}
            onChange={(price) => setDraft({ ...draft, price })}
          />
          <Field
            label="Unit"
            value={draft.unit ?? ""}
            placeholder="1 stick, 30ml"
            onChange={(unit) => setDraft({ ...draft, unit })}
          />
          <Field
            label="Size"
            value={draft.size ?? ""}
            placeholder="30-night pouch"
            onChange={(size) => setDraft({ ...draft, size })}
          />
          <Field
            label="What's in the box"
            value={draft.boxContents ?? ""}
            onChange={(boxContents) => setDraft({ ...draft, boxContents })}
          />
          <Field
            label="SKUs (one per line, up to 3)"
            value={(draft.skus ?? []).join("\n")}
            multiline
            onChange={(text) =>
              setDraft({ ...draft, skus: text.split("\n").map((line) => line.trim()) })
            }
          />
          <Field
            label="One-liner"
            value={draft.oneLiner}
            multiline
            onChange={(oneLiner) => setDraft({ ...draft, oneLiner })}
          />
          <Field
            label="Problem"
            value={draft.problem}
            multiline
            onChange={(problem) => setDraft({ ...draft, problem })}
          />
          <Field
            label="Outcome"
            value={draft.outcome}
            onChange={(outcome) => setDraft({ ...draft, outcome })}
          />
          <Field
            label="Why it works"
            value={draft.mechanism}
            multiline
            onChange={(mechanism) => setDraft({ ...draft, mechanism })}
          />
          <Field
            label="How to use"
            value={draft.howToUse ?? ""}
            multiline
            onChange={(howToUse) => setDraft({ ...draft, howToUse })}
          />
          <Field
            label="How to promote"
            value={draft.promotion ?? ""}
            onChange={(promotion) => setDraft({ ...draft, promotion })}
          />
          <Field
            label="Audience"
            value={draft.audience}
            onChange={(audience) => setDraft({ ...draft, audience })}
          />
          <Field
            label="CTA"
            value={draft.cta}
            onChange={(cta) => setDraft({ ...draft, cta })}
          />
          <Field
            label="Claims locker (one per line)"
            value={draft.claims.join("\n")}
            multiline
            onChange={(text) =>
              setDraft({ ...draft, claims: text.split("\n").map((line) => line.trim()) })
            }
          />
          <Field
            label="Proof (one per line)"
            value={draft.proof.join("\n")}
            multiline
            onChange={(text) =>
              setDraft({ ...draft, proof: text.split("\n").map((line) => line.trim()) })
            }
          />
          <Field
            label="Setting"
            value={draft.setting}
            onChange={(setting) => setDraft({ ...draft, setting })}
          />
          <Field
            label="Wardrobe"
            value={draft.wardrobe}
            onChange={(wardrobe) => setDraft({ ...draft, wardrobe })}
          />
          <Field
            label="Competitor"
            value={draft.competitor ?? ""}
            placeholder="the usual option"
            onChange={(competitor) => setDraft({ ...draft, competitor })}
          />
          <Field
            label="Competitor URL"
            value={draft.competitorUrl ?? ""}
            placeholder="https://"
            onChange={(competitorUrl) => setDraft({ ...draft, competitorUrl })}
          />
          <Field
            label="Brand voice — 3 sample captions"
            value={(draft.voiceSamples ?? []).join("\n")}
            multiline
            placeholder={"ok so i actually fell asleep\nnot a melatonin story.\nthe stick is the whole dose."}
            onChange={(text) =>
              setDraft({
                ...draft,
                voiceSamples: text.split("\n").map((line) => line.trim()).slice(0, 3),
              })
            }
          />
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-fg">{brief.oneLiner}</p>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs tracking-widest text-fg-subtle uppercase">Problem</dt>
              <dd className="mt-1 text-fg-muted">{brief.problem}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-fg-subtle uppercase">Outcome</dt>
              <dd className="mt-1 text-fg-muted">{brief.outcome}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-fg-subtle uppercase">Why it works</dt>
              <dd className="mt-1 text-fg-muted">{brief.mechanism}</dd>
            </div>
            {brief.howToUse ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">How to use</dt>
                <dd className="mt-1 text-fg-muted">{brief.howToUse}</dd>
              </div>
            ) : null}
            {brief.promotion ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Promote</dt>
                <dd className="mt-1 text-fg-muted">{brief.promotion}</dd>
              </div>
            ) : null}
            {brief.benefits?.length ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Benefits</dt>
                <dd className="mt-1 text-fg-muted">{brief.benefits.join(" · ")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs tracking-widest text-fg-subtle uppercase">Audience</dt>
              <dd className="mt-1 text-fg-muted">{brief.audience}</dd>
            </div>
            {brief.unit || brief.size || brief.boxContents ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Shootable</dt>
                <dd className="mt-1 text-fg-muted">
                  {[brief.unit, brief.size, brief.boxContents].filter(Boolean).join(" · ")}
                </dd>
              </div>
            ) : null}
            {brief.skus?.length ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">SKUs</dt>
                <dd className="mt-1 text-fg-muted">{brief.skus.join(" · ")}</dd>
              </div>
            ) : null}
            {brief.stars || brief.tastesLike ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Reviews mined</dt>
                <dd className="mt-1 text-fg-muted">
                  {[brief.stars, brief.tastesLike ? `tastes like ${brief.tastesLike}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            ) : null}
            {brief.reviewQuotes?.length ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Review lines</dt>
                <dd className="mt-1 text-fg-muted">{brief.reviewQuotes.join(" / ")}</dd>
              </div>
            ) : null}
            {brief.competitor ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">Vs</dt>
                <dd className="mt-1 text-fg-muted">{brief.competitor}</dd>
              </div>
            ) : null}
            {brief.rivals?.length ? (
              <div>
                <dt className="text-xs tracking-widest text-fg-subtle uppercase">
                  Rival swarm · auto
                </dt>
                <dd className="mt-1 space-y-2">
                  {brief.rivals.map((rival) => (
                    <p key={rival.name} className="text-fg-muted">
                      <span className="text-fg">{rival.name}</span>
                      {rival.price ? ` · ${rival.price}` : ""}
                      <span className="mt-0.5 block text-xs">{rival.reason}</span>
                      {rival.url ? (
                        <a
                          href={rival.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-steel underline-offset-4 hover:underline"
                        >
                          {rival.url}
                        </a>
                      ) : null}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex flex-wrap gap-1.5">
            {brief.claims.slice(0, 4).map((claim) => (
              <Badge key={claim}>{claim}</Badge>
            ))}
          </div>
          {brief.claimSources?.length ? (
            <div>
              <p className="text-xs tracking-widest text-fg-subtle uppercase">
                Claims locker · source
              </p>
              <ul className="mt-2 space-y-2">
                {brief.claimSources.slice(0, 4).map((item) => (
                  <li key={item.claim} className="text-xs text-fg-muted">
                    <span className="text-fg">{item.claim}</span>
                    <span className="mt-0.5 block">{item.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {(brief.pageAssets?.length || brief.pageImages?.length) ? (
        <PageStills
          assets={
            brief.pageAssets?.length
              ? brief.pageAssets
              : (brief.pageImages ?? []).map((url) => ({ url, kind: "other" as const }))
          }
          onLock={onLockStill}
        />
      ) : null}

      <div className="grid gap-2">
        <Field
          label="Competitor URL"
          value={brief.competitorUrl ?? ""}
          placeholder="Paste a rival URL"
          onChange={(competitorUrl) => onChange({ ...brief, competitorUrl })}
        />
        <Button
          variant="outline"
          disabled={pullingRival || !(brief.competitorUrl ?? "").trim()}
          onClick={() => onPullCompetitor((brief.competitorUrl ?? "").trim())}
        >
          {pullingRival ? "Pulling rival" : "Pull rival"}
        </Button>
      </div>

      <Button variant="outline" onClick={onRemint}>
        Remint from brief
      </Button>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
          Creator roster
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          Persona, wardrobe, usage rights, rate. Assign a keeper later.
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelectCreator(null)}
            className={`h-11 rounded-md px-3 text-left text-sm ${activeCreatorId ? "text-fg-muted hover:bg-bg-subtle" : "bg-bg-subtle text-fg"}`}
          >
            Default from brief
          </button>
          {creators.map((creator) => (
            <div key={creator.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectCreator(creator.id)}
                className={`h-11 min-w-0 flex-1 rounded-md px-3 text-left text-sm ${
                  activeCreatorId === creator.id
                    ? "bg-bg-subtle text-fg"
                    : "text-fg-muted hover:bg-bg-subtle"
                }`}
              >
                <span className="block truncate">{creator.name}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  {rateCard(creator, 1).line}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${creator.name}`}
                onClick={() => onDeleteCreator(creator.id)}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = creatorName.trim();
            if (!name) return;
            onSaveCreator({
              name,
              persona: creatorPersona,
              wardrobe: brief.wardrobe,
              notes: `English-speaking, ${brief.setting}`,
              rights: "Paid usage. Face and voice.",
              rate: creatorRate.trim(),
              usageWindow: DEFAULT_USAGE,
            });
            setCreatorName("");
            setCreatorRate("");
          }}
        >
          <Input
            value={creatorName}
            onChange={(event) => setCreatorName(event.target.value)}
            placeholder="Add a creator"
            className="h-11 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={creatorPersona}
              onChange={(event) => setCreatorPersona(event.target.value as PersonaId)}
              className="h-11 min-w-0 flex-1 rounded-md border border-border bg-bg-subtle px-3 text-sm text-fg"
            >
              {PERSONAS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <Input
              value={creatorRate}
              onChange={(event) => setCreatorRate(event.target.value)}
              placeholder="Rate"
              className="h-11 w-24 shrink-0 text-sm"
            />
            <Button type="submit" variant="outline" size="sm">
              Add
            </Button>
          </div>
        </form>
      </div>

      {brief.url ? (
        <a
          href={brief.url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-steel underline-offset-4 hover:underline"
        >
          {brief.url}
        </a>
      ) : null}
    </aside>
  );
}
