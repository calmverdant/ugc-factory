import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Beat, MintedAd, ProductBrief, RewriteStyle } from "./types";

function apiKey(): string | undefined {
  return process.env.XAI_API_KEY?.trim() || undefined;
}

function stripFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

const RewriteInput = z.object({
  style: z.enum(["shorter", "dryer", "warmer", "more-proof", "global"]),
  hook: z.string(),
  beats: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      label: z.string(),
      line: z.string(),
      visual: z.string(),
    }),
  ),
  caption: z.string(),
  metaPrimary: z.string(),
  onScreenText: z.array(z.string()),
  brief: z.object({
    name: z.string(),
    price: z.string(),
    claims: z.array(z.string()),
    proof: z.array(z.string()),
    cta: z.string(),
  }),
});

const StillInput = z.object({
  prompt: z.string().min(8).max(1200),
});

const VoiceInput = z.object({
  text: z.string().min(1).max(800),
});

const VideoStartInput = z.object({
  prompt: z.string().min(8).max(1600),
  silent: z.boolean(),
  imageUrl: z
    .string()
    .max(2000)
    .refine((value) => value.startsWith("https://"), "https only")
    .optional(),
});

const VideoPollInput = z.object({
  requestId: z.string().min(8).max(80),
});

const MOVES = [
  "slow push-in, product locked in frame, camera moves not the object",
  "handheld orbit around the product in the hands, product stays sharp",
  "hold for the end card, product readable, creator looks to camera then down",
];

export function videoPromptFor(ad: MintedAd, brief: ProductBrief): string {
  return shotVideoPromptFor(ad, brief, 0, 1);
}

export function shotVideoPromptFor(
  ad: MintedAd,
  brief: ProductBrief,
  index: number,
  total: number,
): string {
  const beat = ad.beats[Math.min(index, ad.beats.length - 1)];
  const silent = ad.combo.format === "silent-text";
  const line = (beat?.line ?? ad.hook).slice(0, 180);
  const speech = silent
    ? "No talking. Big type is added in post — keep the mouth still."
    : `The person looks into camera and speaks clearly in global English: "${line}"`;
  return [
    "Handheld authentic UGC, 9:16 iPhone vertical, one continuous take.",
    `${ad.personaLabel} in ${brief.setting}. Wardrobe: ${brief.wardrobe}.`,
    MOVES[index] ?? MOVES[0],
    `${beat?.visual ?? brief.setting}. ${speech}`,
    `ONLY this exact product in frame: ${brief.name} by ${brief.brand}, a ${brief.category}, ${brief.price}.`,
    brief.howToUse ? `How it is used: ${brief.howToUse}.` : "",
    brief.size ? `Size mark ${brief.size} readable.` : "",
    brief.unit ? `Unit ${brief.unit} in shot.` : "",
    "Do not invent a second product, rival bottle, extra brand, website UI, browser tab, design-tool mockup, Kittl, Canva, Figma, or random objects.",
    "Natural window light, real skin, slight mess, no studio campaign, no burned-in captions, no extra logos. English packaging if any text is visible.",
    index === total - 1
      ? "Leave the lower fifth of the frame empty for platform UI and an end card."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const rewriteAdCopy = createServerFn({ method: "POST" })
  .validator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) {
      return { ok: false as const, error: "Rewrite is unavailable in this environment." };
    }
    const styleNote: Record<RewriteStyle, string> = {
      shorter: "Cut every line. Keep the same meaning. Shorter spoken English.",
      dryer: "Drier, less salesy. Skeptical native English. No hype adjectives.",
      warmer: "Warmer, still adult. Friend on a phone, not a presenter.",
      "more-proof": "Lead with proof, price, and mechanism. Keep it human.",
      global:
        "Rewrite in clear global English. A viewer in London, Lagos, Singapore, or Toronto must understand every line. No country-only slang. Keep American spelling. Keep the same claims.",
    };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.5,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You rewrite UGC ad copy in clear global English. No slang that only works in one country. No other languages — never Tamil, Hindi, or mixed script. Do not invent numeric claims missing from the brief. Return JSON only.",
          },
          {
            role: "user",
            content: `${styleNote[data.style]}
Product: ${data.brief.name}, ${data.brief.price}
Allowed claims: ${data.brief.claims.join("; ")}
Allowed proof: ${data.brief.proof.join("; ")}
CTA: ${data.brief.cta}

Return JSON:
{"hook": string, "beats": [{"line": string, "visual": string}], "caption": string, "metaPrimary": string, "onScreenText": string[]}

Keep the same number of beats (${data.beats.length}). English only.

Current hook: ${data.hook}
Beats: ${JSON.stringify(data.beats.map((beat) => ({ label: beat.label, line: beat.line, visual: beat.visual })))}
Caption: ${data.caption}
Meta: ${data.metaPrimary}
OST: ${JSON.stringify(data.onScreenText)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Rewrite failed (${res.status}).` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return { ok: false as const, error: "Empty rewrite." };
    try {
      const parsed = JSON.parse(stripFence(content)) as {
        hook?: string;
        beats?: { line?: string; visual?: string }[];
        caption?: string;
        metaPrimary?: string;
        onScreenText?: string[];
      };
      const beats: Beat[] = data.beats.map((beat, i) => ({
        ...beat,
        line: parsed.beats?.[i]?.line?.trim() || beat.line,
        visual: parsed.beats?.[i]?.visual?.trim() || beat.visual,
      }));
      return {
        ok: true as const,
        hook: parsed.hook?.trim() || data.hook,
        beats,
        caption: parsed.caption?.trim() || data.caption,
        metaPrimary: parsed.metaPrimary?.trim() || data.metaPrimary,
        onScreenText:
          Array.isArray(parsed.onScreenText) && parsed.onScreenText.length
            ? parsed.onScreenText.map((line) => line.trim()).filter(Boolean)
            : data.onScreenText,
      };
    } catch {
      return { ok: false as const, error: "Could not parse the rewrite." };
    }
  });

export const generateStill = createServerFn({ method: "POST" })
  .validator((input: unknown) => StillInput.parse(input))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) {
      return { ok: false as const, error: "Stills are unavailable in this environment." };
    }
    const res = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: `${data.prompt}\nAuthentic UGC still, English-language product packaging if text is visible, global audience, no studio campaign, no extra captions.`,
        n: 1,
        resolution: "1k",
        response_format: "url",
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Still failed (${res.status}).` };
    }
    const body = (await res.json()) as { data?: { url?: string }[] };
    const url = body.data?.[0]?.url;
    if (!url) return { ok: false as const, error: "No still returned." };
    return { ok: true as const, url };
  });

export const speakScript = createServerFn({ method: "POST" })
  .validator((input: unknown) => VoiceInput.parse(input))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) {
      return { ok: false as const, error: "Voice is unavailable in this environment." };
    }
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        text: data.text.slice(0, 800),
        voice_id: "eve",
        language: "en",
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Voice failed (${res.status}).` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ctype = res.headers.get("content-type") || "audio/mpeg";
    return {
      ok: true as const,
      dataUrl: `data:${ctype};base64,${buf.toString("base64")}`,
    };
  });

export const startAdVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => VideoStartInput.parse(input))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) {
      return { ok: false as const, error: "Video is unavailable in this environment." };
    }
    const body: Record<string, unknown> = {
      model: "grok-imagine-video-1.5",
      prompt: data.prompt,
      duration: 6,
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: !data.silent,
    };
    if (data.imageUrl) {
      body.image = { url: data.imageUrl };
    }
    const res = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false as const,
        error: `Video failed to start (${res.status}).${detail.slice(0, 80) ? ` ${detail.slice(0, 80)}` : ""}`,
      };
    }
    const json = (await res.json()) as { request_id?: string };
    if (!json.request_id) {
      return { ok: false as const, error: "No video request id returned." };
    }
    return { ok: true as const, requestId: json.request_id };
  });

export const pollAdVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => VideoPollInput.parse(input))
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) {
      return { ok: false as const, error: "Video is unavailable in this environment." };
    }
    const res = await fetch(
      `https://api.x.ai/v1/videos/${encodeURIComponent(data.requestId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      return { ok: false as const, error: `Video poll failed (${res.status}).` };
    }
    const json = (await res.json()) as {
      status?: string;
      video?: { url?: string; duration?: number };
      error?: string;
    };
    const status = json.status ?? "pending";
    if (status === "done") {
      const url = json.video?.url;
      if (!url) return { ok: false as const, error: "Video finished with no url." };
      return { ok: true as const, status: "done" as const, url };
    }
    if (status === "failed" || status === "expired") {
      return {
        ok: false as const,
        error: json.error || `Video ${status}.`,
      };
    }
    return { ok: true as const, status: "pending" as const };
  });

export type RewriteResult = Awaited<ReturnType<typeof rewriteAdCopy>>;
export type StillResult = Awaited<ReturnType<typeof generateStill>>;

export function applyRewrite(ad: MintedAd, result: Extract<RewriteResult, { ok: true }>): MintedAd {
  return {
    ...ad,
    hook: result.hook,
    beats: result.beats,
    caption: result.caption,
    metaPrimary: result.metaPrimary,
    onScreenText: result.onScreenText,
  };
}
