import { pollAdVideo, shotVideoPromptFor, startAdVideo, videoPromptFor } from "./ai";
import { stillForVideo } from "./assets";
import { stitchClips } from "./ship";
import { refundVideoSlot, takeVideoSlot, videoSlotsLeft } from "./storage";
import type { MintedAd, ProductBrief, ShotClip } from "./types";

export function shotCountFor(duration: number, sequence: boolean): number {
  if (!sequence) return 1;
  if (duration <= 15) return 2;
  return 3;
}

async function pollUntilDone(
  requestId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 4000));
    const poll = await pollAdVideo({
      data: { requestId },
    });
    if (!poll.ok) return poll;
    if (poll.status === "done") return { ok: true, url: poll.url };
  }
  return {
    ok: false,
    error: "Video is still rendering. Press Generate video again in a minute.",
  };
}

async function renderOneShot(input: {
  prompt: string;
  silent: boolean;
  imageUrl?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const slot = takeVideoSlot();
  if (!slot.ok) return slot;
  try {
    const started = await startAdVideo({
      data: {
        prompt: input.prompt,
        silent: input.silent,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      },
    });
    if (!started.ok) {
      refundVideoSlot();
      return started;
    }
    const done = await pollUntilDone(started.requestId);
    if (!done.ok) {
      // Slot was spent; leave it. The clip may still land if they retry.
      return done;
    }
    return done;
  } catch {
    refundVideoSlot();
    return { ok: false, error: "Video failed." };
  }
}

export type RenderProgress = (note: string) => void;

export type RenderOk = { ok: true; url: string; clips: ShotClip[]; bundleUrl?: string };
export type RenderFail = { ok: false; error: string };

export async function renderAdVideo(
  ad: MintedAd,
  brief: ProductBrief,
  opts?: { sequence?: boolean; onProgress?: RenderProgress },
): Promise<RenderOk | RenderFail> {
  const sequence = opts?.sequence ?? false;
  const wanted = shotCountFor(ad.combo.duration, sequence);
  const left = videoSlotsLeft();
  const count = Math.min(wanted, Math.max(1, left));
  if (left < 1) {
    return {
      ok: false,
      error: "Daily clip limit reached (6). Try again tomorrow.",
    };
  }

  const imageUrl = stillForVideo(ad, brief);
  const silent = ad.combo.format === "silent-text";
  const clips: ShotClip[] = [];

  for (let i = 0; i < count; i++) {
    opts?.onProgress?.(
      count === 1
        ? "Rendering a 9:16 UGC video — about a minute."
        : `Shot ${i + 1} of ${count} — about a minute each.`,
    );
    const prompt =
      count === 1
        ? videoPromptFor(ad, brief)
        : shotVideoPromptFor(ad, brief, i, count);
    const shot = await renderOneShot({ prompt, silent, imageUrl });
    if (!shot.ok) {
      if (clips.length) {
        return { ok: true, url: clips[0]!.url, clips };
      }
      return shot;
    }
    clips.push({
      label: ad.beats[i]?.label ?? `Shot ${i + 1}`,
      url: shot.url,
      start: i * 6,
      end: (i + 1) * 6,
    });
  }

  if (clips.length > 1) {
    try {
      opts?.onProgress?.("Bundling shots into one 9:16 video.");
      const bundleUrl = await stitchClips(
        clips.map((clip) => ({ url: clip.url, label: clip.label })),
        `ad-bundle.webm`,
        { download: false },
      );
      return { ok: true, url: bundleUrl, clips, bundleUrl };
    } catch {
      return { ok: true, url: clips[0]!.url, clips };
    }
  }

  return { ok: true, url: clips[0]!.url, clips };
}
