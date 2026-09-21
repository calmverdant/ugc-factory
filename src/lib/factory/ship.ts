import { captionAt } from "./captions";
import type { MintedAd, PlatformId } from "./types";

export const SAFE_CHROME: Record<
  PlatformId,
  { aspect: string; top: string; bottom: string; note: string; label: string }
> = {
  tiktok: {
    aspect: "9 / 16",
    top: "8%",
    bottom: "18%",
    note: "Username + caption + buttons sit in the lower fifth. Keep faces in the upper two-thirds.",
    label: "TikTok 9:16",
  },
  reels: {
    aspect: "9 / 16",
    top: "10%",
    bottom: "16%",
    note: "Reels caption and audio chip sit low-left. CTA above that band.",
    label: "Reels 9:16",
  },
  shorts: {
    aspect: "9 / 16",
    top: "10%",
    bottom: "16%",
    note: "Shorts subscribe chip and title sit low. Leave the lower fifth clear.",
    label: "Shorts 9:16",
  },
  meta: {
    aspect: "4 / 5",
    top: "6%",
    bottom: "12%",
    note: "4:5 feed. Comment bar eats the bottom. End card above it.",
    label: "Meta 4:5",
  },
  pinterest: {
    aspect: "2 / 3",
    top: "8%",
    bottom: "10%",
    note: "2:3 pin. Title in the lower third, not the UI.",
    label: "Pinterest 2:3",
  },
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadVideo(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not read that clip for burn or thumbs."));
  });
  return video;
}

/** Burn English captions into a downloadable WebM. Overlay stays on the preview. */
export async function burnCaptions(ad: MintedAd, src: string): Promise<string> {
  const video = await loadVideo(src);
  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  rec.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    rec.onerror = () => reject(new Error("Burn failed."));
  });
  rec.start(200);
  video.currentTime = 0;
  await video.play().catch(() => undefined);
  const draw = () => {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);
    const vw = video.videoWidth || width;
    const vh = video.videoHeight || height;
    const scale = Math.max(width / vw, height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
    const line = captionAt(ad, video.currentTime);
    if (line) {
      ctx.font = "600 28px Figtree, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.fillStyle = "#f3efe6";
      const y = height * 0.82;
      wrapText(ctx, line, width / 2, y, width * 0.84, 34);
    }
    if (!video.ended && rec.state === "recording") {
      requestAnimationFrame(draw);
    }
  };
  draw();
  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
    window.setTimeout(resolve, Math.max(4000, (video.duration || 6) * 1000 + 400));
  });
  rec.stop();
  const blob = await done;
  downloadBlob(blob, `ad-${String(ad.number).padStart(4, "0")}-captioned.webm`);
  return URL.createObjectURL(blob);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  leading: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  const start = y - (lines.length - 1) * leading;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    ctx.strokeText(line, x, start + i * leading);
    ctx.fillText(line, x, start + i * leading);
  }
}

export async function pickThumbnails(
  src: string,
): Promise<{ nine: string; square: string; stills: string[] }> {
  const video = await loadVideo(src);
  const times = [0.35, Math.min(2, (video.duration || 6) * 0.4), Math.min(4.2, (video.duration || 6) * 0.75)];
  const stills: string[] = [];
  for (const t of times) {
    video.currentTime = t;
    await wait(80);
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stills.push(canvas.toDataURL("image/jpeg", 0.84));
  }
  const nine = stills[0] ?? "";
  const squareCanvas = document.createElement("canvas");
  squareCanvas.width = 720;
  squareCanvas.height = 720;
  const sctx = squareCanvas.getContext("2d");
  if (sctx && nine) {
    const img = new Image();
    img.src = nine;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    const crop = (1280 - 720) / 2;
    sctx.drawImage(img, 0, -crop, 720, 1280);
  }
  return { nine, square: squareCanvas.toDataURL("image/jpeg", 0.84), stills };
}

export async function stitchClips(
  clips: { url: string; label: string }[],
  filename = "ugc-bundle.webm",
  opts?: { download?: boolean },
): Promise<string> {
  if (!clips.length) throw new Error("No clips to bundle.");
  if (clips.length === 1) return clips[0]!.url;

  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_800_000 });
  rec.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    rec.onerror = () => reject(new Error("Bundle failed."));
  });
  rec.start(200);

  for (const clip of clips) {
    const video = await loadVideo(clip.url);
    video.currentTime = 0;
    await video.play().catch(() => undefined);
    await new Promise<void>((resolve) => {
      const draw = () => {
        ctx.fillStyle = "#1a1916";
        ctx.fillRect(0, 0, width, height);
        const vw = video.videoWidth || width;
        const vh = video.videoHeight || height;
        const scale = Math.max(width / vw, height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
        if (!video.ended) {
          requestAnimationFrame(draw);
        } else {
          resolve();
        }
      };
      draw();
      window.setTimeout(resolve, Math.max(4000, (video.duration || 6) * 1000 + 300));
    });
    video.pause();
  }

  rec.stop();
  const blob = await done;
  if (opts?.download !== false) downloadBlob(blob, filename);
  return URL.createObjectURL(blob);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

type BedHandle = { stop: () => void; duck: (on: boolean) => void };

/** Licensed-safe procedural bed. One bed, ducked under Eve. Button-press only. */
export function startBed(): BedHandle | null {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.045;
  master.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  oscA.type = "sine";
  oscA.frequency.value = 110;
  const oscB = ctx.createOscillator();
  oscB.type = "sine";
  oscB.frequency.value = 164.81;
  const mix = ctx.createGain();
  mix.gain.value = 0.6;
  oscA.connect(mix);
  oscB.connect(mix);

  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  noise.connect(filter);
  filter.connect(mix);
  mix.connect(master);

  oscA.start();
  oscB.start();
  noise.start();
  void ctx.resume();

  return {
    stop: () => {
      try {
        oscA.stop();
        oscB.stop();
        noise.stop();
        void ctx.close();
      } catch {
        // ignore
      }
    },
    duck: (on: boolean) => {
      master.gain.setTargetAtTime(on ? 0.012 : 0.045, ctx.currentTime, 0.08);
    },
  };
}
