import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm text-fg shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
