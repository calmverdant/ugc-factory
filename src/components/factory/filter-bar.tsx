import { cn } from "@/lib/utils";
import {
  FILTER_DURATIONS,
  FILTER_FORMATS,
  FILTER_PERSONAS,
  FILTER_PLATFORMS,
} from "@/lib/factory/mint";
import { OFFERS } from "@/lib/factory/offers";
import type { FactoryFilters } from "@/lib/factory/types";

function Pills<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={String(option.id)}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors duration-150",
                active
                  ? "border-steel bg-steel text-accent-fg"
                  : "border-border bg-transparent text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FactoryFilters;
  onChange: (next: FactoryFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Pills
        label="Desk"
        value={filters.desk}
        options={[
          { id: "shelf" as const, label: "Shelf" },
          { id: "matrix" as const, label: "Matrix" },
          { id: "ab" as const, label: "A/B board" },
          { id: "alpha" as const, label: "α/β formats" },
          { id: "opens" as const, label: "Opens" },
          { id: "calendar" as const, label: "Calendar" },
          { id: "kit" as const, label: "Brand kit" },
        ]}
        onChange={(desk) => onChange({ ...filters, desk })}
      />
      {filters.desk === "shelf" ? (
        <Pills
          label="Shelf"
          value={filters.view}
          options={[
            { id: "all" as const, label: "All" },
            { id: "keepers" as const, label: "Keepers" },
            { id: "hidden" as const, label: "Hidden" },
          ]}
          onChange={(view) => onChange({ ...filters, view })}
        />
      ) : null}
      <Pills
        label="Offer"
        value={filters.offer}
        options={OFFERS.map((item) => ({ id: item.id, label: item.label }))}
        onChange={(offer) => onChange({ ...filters, offer })}
      />
      <Pills
        label="Platform"
        value={filters.platform}
        options={FILTER_PLATFORMS.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        onChange={(platform) => onChange({ ...filters, platform })}
      />
      <Pills
        label="Format"
        value={filters.format}
        options={FILTER_FORMATS.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        onChange={(format) => onChange({ ...filters, format })}
      />
      <Pills
        label="Persona"
        value={filters.persona}
        options={FILTER_PERSONAS.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        onChange={(persona) => onChange({ ...filters, persona })}
      />
      <Pills
        label="Length"
        value={filters.duration}
        options={FILTER_DURATIONS}
        onChange={(duration) => onChange({ ...filters, duration })}
      />
    </div>
  );
}
