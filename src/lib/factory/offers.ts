import type { OfferId } from "./types";

export const OFFERS: { id: OfferId; label: string; line: string }[] = [
  { id: "none", label: "Evergreen", line: "" },
  {
    id: "launch",
    label: "Launch",
    line: "This is launch week — say the name once, then the reason it exists.",
  },
  {
    id: "bundle",
    label: "Bundle",
    line: "Show the set together. Do not treat it as a single unit if it is a pair.",
  },
  {
    id: "flash",
    label: "Flash sale",
    line: "Put the live price on screen. No fake countdown clocks.",
  },
  {
    id: "holiday",
    label: "Holiday",
    line: "Gift energy without costumes. This is the one you give, not a winter commercial.",
  },
  {
    id: "summer",
    label: "Summer",
    line: "Daylight, travel bags, no fireplace. Keep wardrobe light.",
  },
  {
    id: "back-to-school",
    label: "Back to school",
    line: "Weekday morning pace. Kitchen, bag, door. No campus cliché.",
  },
  {
    id: "prime",
    label: "Prime Day",
    line: "Prime Day price is the live one. Name the window once. No fake timers.",
  },
  {
    id: "bfcm",
    label: "BFCM",
    line: "Black Friday / Cyber Monday. One number on screen. No manufactured urgency.",
  },
];

export function offerLine(id: OfferId): string {
  return OFFERS.find((item) => item.id === id)?.line ?? "";
}

export function offerLabel(id: OfferId): string {
  return OFFERS.find((item) => item.id === id)?.label ?? "Evergreen";
}
