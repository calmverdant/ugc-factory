import type { MintedAd, PlatformId, ProductBrief } from "./types";

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

function stamp(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const whole = Math.floor(sec);
  const ms = Math.round((sec - whole) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(whole)},${String(ms).padStart(3, "0")}`;
}

function stampVtt(seconds: number): string {
  return stamp(seconds).replace(",", ".");
}

export function captionsSrt(ad: MintedAd): string {
  return ad.beats
    .map((beat, i) => {
      return `${i + 1}\n${stamp(beat.start)} --> ${stamp(beat.end)}\n${beat.line}\n`;
    })
    .join("\n");
}

export function captionsVtt(ad: MintedAd): string {
  const body = ad.beats
    .map((beat) => `${stampVtt(beat.start)} --> ${stampVtt(beat.end)}\n${beat.line}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function captionAt(ad: MintedAd, time: number): string {
  const beat = ad.beats.find((item) => time >= item.start && time < item.end);
  return beat?.line ?? ad.beats[ad.beats.length - 1]?.line ?? ad.hook;
}

export function premiereMarkers(ad: MintedAd): string {
  const rows = ["name,in,out,duration,notes"];
  for (const beat of ad.beats) {
    rows.push(
      [
        csv(beat.label),
        String(beat.start),
        String(beat.end),
        String(beat.end - beat.start),
        csv(beat.line),
      ].join(","),
    );
  }
  for (const shot of ad.shotList) {
    rows.push(
      [
        csv(`SHOT ${shot.frame.slice(0, 24)}`),
        String(shot.start),
        String(shot.end),
        String(shot.end - shot.start),
        csv(shot.note),
      ].join(","),
    );
  }
  return rows.join("\n");
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function endCardLines(brief: ProductBrief, ad: MintedAd): string[] {
  return [brief.name, brief.price, brief.cta || ad.caption.split("\n")[0] || ""].filter(
    Boolean,
  );
}

export function capCutChapters(ad: MintedAd): string {
  return ad.beats
    .map(
      (beat) =>
        `${Math.floor(beat.start / 60)}:${String(beat.start % 60).padStart(2, "0")} ${beat.label} — ${beat.line}`,
    )
    .join("\n");
}

/** Lower-fifth padding so captions and the end card sit above TikTok / Reels / Shorts UI. */
export function safeZoneBottom(platform: PlatformId): string {
  if (platform === "meta") return "12%";
  if (platform === "pinterest") return "10%";
  return "18%";
}

export function safeZoneNote(platform: PlatformId): string {
  if (platform === "meta") return "4:5 feed. Keep the CTA above the comment bar.";
  if (platform === "pinterest") return "2:3 pin. Title sits in the lower third, not the UI.";
  return "9:16. Lower fifth is platform UI — captions and end card sit above it.";
}

export function landingBlock(brief: ProductBrief, ad: MintedAd): string {
  const video = ad.videoUrl
    ? `<video src="${escapeAttr(ad.videoUrl)}" controls playsinline poster="${escapeAttr(ad.stillUrl ?? "")}" style="width:100%;max-width:360px;aspect-ratio:9/16;object-fit:cover;background:#111"></video>`
    : ad.stillUrl
      ? `<img src="${escapeAttr(ad.stillUrl)}" alt="${escapeAttr(brief.name)}" style="width:100%;max-width:360px"/>`
      : "";
  return `<!-- UGC Factory landing block: paste into a PDP. English, global. -->
<figure class="ugc-factory-block" style="font-family:Georgia,serif;color:#1a1916;max-width:420px">
  <blockquote style="font-style:italic;font-size:1.35rem;margin:0 0 12px">${escapeHtml(ad.hook)}</blockquote>
  ${video}
  <figcaption style="margin-top:12px;white-space:pre-wrap;font-size:0.95rem">${escapeHtml(ad.caption)}</figcaption>
  <p style="margin:8px 0 0;font-size:0.8rem;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(brief.name)} · ${escapeHtml(brief.price)} · ${escapeHtml(brief.cta)}</p>
</figure>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
