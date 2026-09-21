import { slugify } from "@/lib/utils";
import {
  capCutChapters,
  captionsSrt,
  captionsVtt,
  landingBlock,
  premiereMarkers,
} from "./captions";
import { rateCard, shotLoad, talentBriefHtml, utmFor } from "./desk";
import { offerLabel } from "./offers";
import { CALL_SHEET_CHECKS } from "./policy";
import type { Creator, MintedAd, ProductBrief } from "./types";
import { DEFAULT_USAGE } from "./types";
import { zipStore } from "./zip";

function ts(start: number, end: number): string {
  return `${start}–${end}s`;
}

function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function usageLine(creator?: Creator | null): string {
  return creator?.usageWindow?.trim() || DEFAULT_USAGE;
}

export function packMarkdown(
  brief: ProductBrief,
  ads: MintedAd[],
  creator?: Creator | null,
): string {
  const lines: string[] = [];
  lines.push(`# UGC Factory pack — ${brief.name}`);
  lines.push("");
  lines.push(`Brand: ${brief.brand}  `);
  lines.push(`Category: ${brief.category}  `);
  lines.push(`Price: ${brief.price}  `);
  if (brief.unit) lines.push(`Unit: ${brief.unit}  `);
  if (brief.size) lines.push(`Size: ${brief.size}  `);
  if (brief.boxContents) lines.push(`What's in the box: ${brief.boxContents}  `);
  if (brief.skus?.length) lines.push(`SKUs: ${brief.skus.join("; ")}  `);
  if (brief.competitor) lines.push(`Competitor: ${brief.competitor}  `);
  if (brief.url) lines.push(`URL: ${brief.url}  `);
  lines.push(`Language: English (global)  `);
  lines.push(`Usage: ${usageLine(creator)}  `);
  lines.push(`Minted: ${ads.length} ads`);
  lines.push("");
  lines.push("## Product brief");
  lines.push("");
  lines.push(brief.oneLiner);
  lines.push("");
  lines.push(`- Problem: ${brief.problem}`);
  lines.push(`- Outcome: ${brief.outcome}`);
  lines.push(`- Mechanism: ${brief.mechanism}`);
  lines.push(`- Differentiator: ${brief.differentiator}`);
  lines.push(`- Audience: ${brief.audience}`);
  lines.push(`- CTA: ${brief.cta}`);
  lines.push(`- Claims locker: ${brief.claims.join("; ")}`);
  lines.push(`- Proof: ${brief.proof.join("; ")}`);
  if (brief.voiceSamples?.length) {
    lines.push(`- Brand voice: ${brief.voiceSamples.join(" / ")}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const ad of ads) {
    lines.push(`## Ad ${String(ad.number).padStart(3, "0")} — ${ad.formatLabel} / ${ad.platformLabel}`);
    lines.push("");
    lines.push(`- Hook style: ${ad.hookLabel}`);
    lines.push(`- Persona: ${ad.personaLabel}`);
    lines.push(`- Length: ${ad.combo.duration}s`);
    lines.push(`- Offer: ${offerLabel(ad.offer ?? "none")}`);
    lines.push(`- Score: ${ad.hookScore?.value ?? "—"} ${ad.hookScore?.label ?? ""}`);
    if (ad.ctr) lines.push(`- CTR: ${ad.ctr}`);
    if (ad.cpa) lines.push(`- CPA: ${ad.cpa}`);
    if (ad.thumbStop) lines.push(`- Thumb-stop: ${ad.thumbStop}`);
    if (ad.winner) lines.push(`- A/B: winner`);
    if (ad.pairId) lines.push(`- A/B pair: ${ad.pairId}`);
    if (ad.angle) lines.push(`- Angle: ${ad.angle}`);
    if (ad.sku) lines.push(`- SKU: ${ad.sku}`);
    if (ad.sparkCode) lines.push(`- Spark / code: ${ad.sparkCode}`);
    lines.push(`- UTM: ${utmFor(brief, ad)}`);
    lines.push(`- Legal: ${ad.legalStamp ?? "none"}`);
    lines.push(`- ${shotLoad(ad).line}`);
    lines.push(`- Aspect: ${ad.combo.platform === "meta" ? "4:5" : "9:16"}`);
    if (ad.policy?.flags.length) {
      lines.push(
        `- Policy: ${ad.policy.flags.map((flag) => `${flag.severity} ${flag.label}`).join("; ")}`,
      );
    }
    lines.push("");
    lines.push(`**Hook:** ${ad.hook}`);
    lines.push("");
    lines.push("### Timed script");
    lines.push("");
    for (const beat of ad.beats) {
      lines.push(`- **${ts(beat.start, beat.end)} · ${beat.label}**`);
      lines.push(`  - Line: ${beat.line}`);
      lines.push(`  - Visual: ${beat.visual}`);
    }
    lines.push("");
    lines.push("### On-screen text");
    lines.push("");
    for (const text of ad.onScreenText) lines.push(`- ${text}`);
    lines.push("");
    lines.push("### Caption (hard-of-hearing English, not a translation pack)");
    lines.push("");
    lines.push(ad.caption);
    lines.push("");
    lines.push(`Hashtags: ${ad.hashtags.map((t) => `#${t}`).join(" ")}`);
    lines.push("");
    lines.push("### Meta primary text");
    lines.push("");
    lines.push(ad.metaPrimary);
    lines.push("");
    lines.push("### Shot list");
    lines.push("");
    for (const shot of ad.shotList) {
      lines.push(`- **${ts(shot.start, shot.end)}** ${shot.frame} — ${shot.note}`);
    }
    lines.push("");
    lines.push("### Creator direction");
    lines.push("");
    for (const item of ad.creatorDirection) lines.push(`- ${item}`);
    lines.push("");
    if (ad.note) {
      lines.push("### Producer notes");
      lines.push("");
      lines.push(ad.note);
      lines.push("");
    }
    lines.push("### Image prompt");
    lines.push("");
    lines.push(ad.imagePrompt);
    lines.push("");
    if (ad.videoUrl) {
      lines.push("### Video clip");
      lines.push("");
      lines.push(ad.videoUrl);
      lines.push("");
    }
    if (ad.shotClips?.length) {
      lines.push("### Sequence shots");
      lines.push("");
      for (const clip of ad.shotClips) {
        lines.push(`- ${clip.label} ${ts(clip.start, clip.end)} ${clip.url}`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push("## Call-sheet checklist");
  lines.push("");
  for (const item of CALL_SHEET_CHECKS) lines.push(`- [ ] ${item}`);
  lines.push("");
  lines.push(`_Usage stamp: ${usageLine(creator)}_`);
  lines.push("");
  lines.push("_Minted with UGC Factory. English, global._");
  lines.push("");
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function packCsv(brief: ProductBrief, ads: MintedAd[]): string {
  const header = [
    "ad_number",
    "product",
    "brand",
    "platform",
    "format",
    "persona",
    "duration",
    "offer",
    "hook_score",
    "ctr",
    "cpa",
    "thumb_stop",
    "winner",
    "angle",
    "sku",
    "spark",
    "utm",
    "legal",
    "hook",
    "caption",
    "hashtags",
    "meta_primary_text",
    "cta",
    "claims_ok",
    "policy_ok",
    "video_url",
    "thumbnail",
  ];
  const rows = ads.map((ad) =>
    [
      String(ad.number),
      brief.name,
      brief.brand,
      ad.platformLabel,
      ad.formatLabel,
      ad.personaLabel,
      String(ad.combo.duration),
      offerLabel(ad.offer ?? "none"),
      String(ad.hookScore?.value ?? ""),
      ad.ctr ?? "",
      ad.cpa ?? "",
      ad.thumbStop ?? "",
      ad.winner ? "winner" : "",
      ad.angle ?? "",
      ad.sku ?? "",
      ad.sparkCode ?? "",
      utmFor(brief, ad),
      ad.legalStamp ?? "",
      ad.hook,
      ad.caption,
      ad.hashtags.map((tag) => `#${tag}`).join(" "),
      ad.metaPrimary,
      brief.cta,
      ad.claims?.ok === false ? "flag" : "ok",
      ad.policy?.ok === false ? "flag" : "ok",
      ad.videoUrl ?? "",
      ad.stillUrl ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function adsManagerJson(brief: ProductBrief, ads: MintedAd[]): string {
  return JSON.stringify(
    {
      language: "en",
      audience: "global",
      product: {
        name: brief.name,
        brand: brief.brand,
        price: brief.price,
        url: brief.url ?? "",
        cta: brief.cta,
        skus: brief.skus ?? [],
      },
      ads: ads.map((ad) => ({
        name: `${brief.name} · ${ad.platformLabel} · ${pad(ad.number)}`,
        platform: ad.combo.platform,
        format: ad.combo.format,
        duration: ad.combo.duration,
        primary_text: ad.metaPrimary,
        headline: ad.hook,
        description: ad.caption,
        cta: brief.cta,
        thumbnail: ad.stillUrl ?? "",
        video_url: ad.videoUrl ?? "",
        shot_clips: ad.shotClips ?? [],
        hashtags: ad.hashtags,
        hook_score: ad.hookScore?.value ?? null,
        winner: !!ad.winner,
        spark_code: ad.sparkCode ?? "",
        utm: utmFor(brief, ad),
        legal: ad.legalStamp ?? "none",
        sku: ad.sku ?? "",
        angle: ad.angle ?? "",
      })),
    },
    null,
    2,
  );
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

export function downloadPack(brief: ProductBrief, ads: MintedAd[], creator?: Creator | null) {
  downloadBlob(
    packMarkdown(brief, ads, creator),
    `ugc-factory-${slugify(brief.name) || "pack"}.md`,
    "text/markdown",
  );
}

export function downloadCsv(brief: ProductBrief, ads: MintedAd[]) {
  downloadBlob(
    packCsv(brief, ads),
    `ugc-factory-${slugify(brief.name) || "pack"}-ads.csv`,
    "text/csv",
  );
}

export function downloadAdsJson(brief: ProductBrief, ads: MintedAd[]) {
  downloadBlob(
    adsManagerJson(brief, ads),
    `ugc-factory-${slugify(brief.name) || "pack"}-ads-manager.json`,
    "application/json",
  );
}

export function downloadSrt(ad: MintedAd) {
  downloadBlob(captionsSrt(ad), `ad-${pad(ad.number)}-captions.srt`, "text/plain");
}

export function downloadVtt(ad: MintedAd) {
  downloadBlob(captionsVtt(ad), `ad-${pad(ad.number)}-captions.vtt`, "text/vtt");
}

export function downloadPremiere(ad: MintedAd) {
  downloadBlob(
    premiereMarkers(ad),
    `ad-${pad(ad.number)}-premiere.csv`,
    "text/csv",
  );
}

export function downloadCapCut(ad: MintedAd) {
  downloadBlob(capCutChapters(ad), `ad-${pad(ad.number)}-capcut.txt`, "text/plain");
}

export function downloadLanding(brief: ProductBrief, ad: MintedAd) {
  downloadBlob(
    landingBlock(brief, ad),
    `ad-${pad(ad.number)}-landing.html`,
    "text/html",
  );
}

export function downloadZipPack(
  brief: ProductBrief,
  ads: MintedAd[],
  creator?: Creator | null,
) {
  const files: { name: string; content: string }[] = [
    { name: "pack.md", content: packMarkdown(brief, ads, creator) },
    { name: "ads.csv", content: packCsv(brief, ads) },
    { name: "ads-manager.json", content: adsManagerJson(brief, ads) },
    { name: "call-sheet.html", content: callSheetHtml(brief, ads, creator) },
    { name: "usage.txt", content: usageLine(creator) },
    {
      name: "utm.txt",
      content: ads.map((ad) => `${pad(ad.number)}\t${utmFor(brief, ad)}`).join("\n"),
    },
    {
      name: "clips.txt",
      content: ads
        .flatMap((ad) => {
          const rows = [`# Ad ${pad(ad.number)} ${ad.hook}`];
          if (ad.videoUrl) rows.push(ad.videoUrl);
          for (const clip of ad.shotClips ?? []) rows.push(`${clip.label} ${clip.url}`);
          if (ad.stillUrl) rows.push(`still ${ad.stillUrl}`);
          return rows;
        })
        .join("\n"),
    },
  ];
  if (ads[0]) {
    files.push({
      name: "landing.html",
      content: landingBlock(brief, ads[0]),
    });
  }
  for (const ad of ads) {
    const stem = `ad-${pad(ad.number)}`;
    files.push({ name: `captions/${stem}.srt`, content: captionsSrt(ad) });
    files.push({ name: `captions/${stem}.vtt`, content: captionsVtt(ad) });
    files.push({ name: `markers/${stem}-premiere.csv`, content: premiereMarkers(ad) });
    files.push({ name: `markers/${stem}-capcut.txt`, content: capCutChapters(ad) });
    files.push({ name: `talent/${stem}.html`, content: talentBriefHtml(brief, ad, creator) });
  }
  downloadBlob(
    zipStore(files),
    `ugc-factory-${slugify(brief.name) || "pack"}.zip`,
    "application/zip",
  );
}

export function callSheetHtml(
  brief: ProductBrief,
  ads: MintedAd[],
  creator?: Creator | null,
): string {
  const checks = CALL_SHEET_CHECKS.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const blocks = ads
    .map((ad) => {
      const shots = ad.shotList
        .map(
          (shot) =>
            `<li><strong>${ts(shot.start, shot.end)}</strong> ${escapeHtml(shot.frame)} — ${escapeHtml(shot.note)}</li>`,
        )
        .join("");
      const script = ad.beats
        .map(
          (beat) =>
            `<p><span class="t">${ts(beat.start, beat.end)} · ${escapeHtml(beat.label)}</span><br/>${escapeHtml(beat.line)}</p>`,
        )
        .join("");
      const policy = ad.policy?.flags.length
        ? `<p class="meta">Policy: ${escapeHtml(
            ad.policy.flags.map((flag) => `${flag.severity} ${flag.label}`).join(" · "),
          )}</p>`
        : "";
      return `<article>
        <h2>Ad ${String(ad.number).padStart(4, "0")} · ${escapeHtml(ad.platformLabel)} · ${ad.combo.duration}s</h2>
        <p class="hook">${escapeHtml(ad.hook)}</p>
        <p class="meta">${escapeHtml(ad.formatLabel)} · ${escapeHtml(ad.personaLabel)} · ${escapeHtml(offerLabel(ad.offer ?? "none"))} · Score ${ad.hookScore?.value ?? "—"} · ${escapeHtml(shotLoad(ad).line)}</p>
        ${policy}
        <h3>Script</h3>
        ${script}
        <h3>Shot list</h3>
        <ol>${shots}</ol>
        <h3>Wardrobe / setting</h3>
        <p>${escapeHtml(brief.wardrobe)}. ${escapeHtml(brief.setting)}.</p>
        ${
          creator
            ? `<p>Creator: ${escapeHtml(creator.name)} — ${escapeHtml(creator.rights || "")} · ${escapeHtml(rateCard(creator, 1).line)} · ${escapeHtml(creator.usageWindow || DEFAULT_USAGE)}</p>`
            : ""
        }
        <h3>Direction</h3>
        <ul>${ad.creatorDirection.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <h3>Hard-of-hearing captions (English)</h3>
        <pre>${escapeHtml(captionsSrt(ad))}</pre>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Call sheet — ${escapeHtml(brief.name)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a1916; background: #f3efe6; margin: 32px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 28px 0 8px; }
    h3 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #5c5850; }
    .hook { font-style: italic; font-size: 18px; }
    .meta, .t { font-family: ui-monospace, monospace; font-size: 12px; color: #5c5850; }
    article { page-break-inside: avoid; border-top: 1px solid #d9d3c7; padding-top: 16px; }
    pre { white-space: pre-wrap; font-size: 11px; }
    @media print { body { margin: 16px; background: white; } }
  </style>
</head>
<body>
  <h1>Call sheet — ${escapeHtml(brief.name)}</h1>
  <p class="meta">${escapeHtml(brief.brand)} · ${escapeHtml(brief.category)} · ${escapeHtml(brief.price)} · English, global</p>
  <p>${escapeHtml(brief.oneLiner)}</p>
  <p class="meta">${escapeHtml(usageLine(creator))}</p>
  <h3>Checklist</h3>
  <ul>${checks}</ul>
  ${blocks}
</body>
</html>`;
}

export function shootPackHtml(
  brief: ProductBrief,
  ad: MintedAd,
  creator?: Creator | null,
): string {
  return callSheetHtml(brief, [ad], creator);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

export function printCallSheet(
  brief: ProductBrief,
  ads: MintedAd[],
  creator?: Creator | null,
) {
  printHtml(callSheetHtml(brief, ads, creator));
}

export function printShootPack(
  brief: ProductBrief,
  ad: MintedAd,
  creator?: Creator | null,
) {
  printHtml(shootPackHtml(brief, ad, creator));
}

export function printTalentBrief(
  brief: ProductBrief,
  ad: MintedAd,
  creator?: Creator | null,
) {
  printHtml(talentBriefHtml(brief, ad, creator));
}

function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 250);
}
