import { cn } from "@/lib/utils";

export function PressMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 text-paper", className)}
      aria-hidden
    >
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect x="9" y="9" width="14" height="14" rx="1.5" fill="currentColor" />
      <rect x="12" y="13" width="8" height="1.6" className="fill-bg" />
      <rect x="12" y="17" width="5" height="1.6" className="fill-bg" />
    </svg>
  );
}
