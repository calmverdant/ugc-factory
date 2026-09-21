import type { PriceLocaleId, SpellingId } from "./types";

const GB: [RegExp, string][] = [
  [/\bcolor(s|ed|ing)?\b/gi, "colour$1"],
  [/\bfavorite(s)?\b/gi, "favourite$1"],
  [/\bhonor(s|ed|ing)?\b/gi, "honour$1"],
  [/\bbehavior(s)?\b/gi, "behaviour$1"],
  [/\borganize(s|d|r)?\b/gi, "organise$1"],
  [/\borganizing\b/gi, "organising"],
  [/\brecognize(s|d)?\b/gi, "recognise$1"],
  [/\bcenter(s|ed)?\b/gi, "centre$1"],
  [/\bflavor(s|ed)?\b/gi, "flavour$1"],
  [/\bgray\b/gi, "grey"],
  [/\btheater(s)?\b/gi, "theatre$1"],
  [/\baging\b/gi, "ageing"],
  [/\bcheck(s)?\b(?= (the|this) (product|page))/gi, "cheque$1"],
];

const IN: [RegExp, string][] = [
  ...GB,
  [/\bprogram(s)?\b/gi, "programme$1"],
  [/\bmath\b/gi, "maths"],
];

function restoreCase(sample: string, replacement: string): string {
  if (!sample) return replacement;
  if (sample === sample.toUpperCase()) return replacement.toUpperCase();
  if (sample[0] === sample[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function applyPairs(text: string, pairs: [RegExp, string][]): string {
  let next = text;
  for (const [pattern, template] of pairs) {
    next = next.replace(pattern, (match, group1?: string) => {
      const raw = template.replace("$1", group1 ?? "");
      return restoreCase(match, raw);
    });
  }
  return next;
}

/** Mint stays EN-US. Spelling packs remap at kit-apply, same claims. */
export function applySpelling(text: string, spelling: SpellingId): string {
  if (spelling === "en-gb") return applyPairs(text, GB);
  if (spelling === "en-in") return applyPairs(text, IN);
  return text;
}

export function spellingLabel(id: SpellingId): string {
  if (id === "en-gb") return "EN-GB";
  if (id === "en-in") return "EN-IN";
  return "EN-US";
}

const MARK: Record<PriceLocaleId, { prefix: string; suffix: string }> = {
  usd: { prefix: "$", suffix: "" },
  gbp: { prefix: "£", suffix: "" },
  eur: { prefix: "€", suffix: "" },
  cad: { prefix: "CAD ", suffix: "" },
};

/** Swap the currency mark. Does not rewrite the spoken script. */
export function displayPrice(price: string, locale: PriceLocaleId): string {
  const mark = MARK[locale];
  const amount =
    price.match(/[\d,]+(?:\.\d{1,2})?/)?.[0] ??
    price.replace(/^[^\d]+/, "").trim();
  if (!amount) return `${mark.prefix}${price}${mark.suffix}`.trim();
  return `${mark.prefix}${amount}${mark.suffix}`.trim();
}

export function priceLocaleLabel(id: PriceLocaleId): string {
  if (id === "gbp") return "£";
  if (id === "eur") return "€";
  if (id === "cad") return "CAD";
  return "$";
}
