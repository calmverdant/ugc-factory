import { Button } from "@/components/ui/button";
import { matrixRows } from "@/lib/factory/matrix";
import type { FormatId, MintedAd, PlatformId } from "@/lib/factory/types";

export function MatrixView({
  ads,
  onFill,
  onCell,
}: {
  ads: MintedAd[];
  onFill: () => void;
  onCell: (format: FormatId, platform: PlatformId) => void;
}) {
  const rows = matrixRows(ads);
  const holes = rows.reduce(
    (n, row) => n + row.cells.filter((cell) => !cell.filled).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
          Format × platform · {holes} holes
        </p>
        <Button size="sm" variant="paper" onClick={onFill} disabled={holes === 0}>
          Fill the gaps
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-bg-elevated">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-fg-subtle">
              <th className="px-3 py-3 font-medium">Format</th>
              {rows[0]?.cells.map((cell) => (
                <th key={cell.platform} className="px-2 py-3 text-center font-medium">
                  {cell.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.format} className="border-b border-border last:border-0">
                <th className="px-3 py-2 font-medium text-fg">{row.label}</th>
                {row.cells.map((cell) => (
                  <td key={cell.platform} className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onCell(row.format, cell.platform)}
                      className={`h-11 w-full min-w-12 rounded-md text-xs ${
                        cell.filled
                          ? "bg-paper text-ink"
                          : "border border-dashed border-border text-fg-subtle"
                      }`}
                    >
                      {cell.filled ? cell.count : "—"}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
