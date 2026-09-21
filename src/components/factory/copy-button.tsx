import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyText, cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  className,
  variant = "quiet",
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: "ghost" | "outline" | "ink" | "paper" | "quiet";
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    const ok = await copyText(text);
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={cn("min-h-9", className)}
      onClick={onCopy}
    >
      {done ? <Check /> : <Copy />}
      {done ? "Copied" : label}
    </Button>
  );
}
