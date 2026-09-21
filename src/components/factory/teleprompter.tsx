import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { MintedAd } from "@/lib/factory/types";

export function Teleprompter({
  ad,
  stillUrl,
  onClose,
  onTake,
}: {
  ad: MintedAd;
  stillUrl?: string | null;
  onClose: () => void;
  onTake?: (url: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const beat = ad.beats[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!playing || !beat) return;
    const ms = Math.max(1200, (beat.end - beat.start) * 1000);
    const timer = window.setTimeout(() => {
      if (index >= ad.beats.length - 1) {
        setPlaying(false);
        return;
      }
      setIndex((value) => value + 1);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [playing, index, beat, ad.beats.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === " " || event.key === "ArrowRight") {
        event.preventDefault();
        if (event.key === " ") {
          setPlaying((value) => !value);
        } else {
          setIndex((value) => Math.min(ad.beats.length - 1, value + 1));
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPlaying(false);
        setIndex((value) => Math.max(0, value - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ad.beats.length, onClose]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 1280 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCamOn(true);
    } catch {
      setCamOn(false);
    }
  }

  function stopCam() {
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamOn(false);
    setRecording(false);
  }

  function startRec() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      onTake?.(url);
      setRecording(false);
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
    setPlaying(true);
  }

  function stopRec() {
    recRef.current?.stop();
    setRecording(false);
    setPlaying(false);
  }

  if (!beat || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-ink text-paper"
      data-testid="teleprompter"
      role="dialog"
      aria-modal="true"
      aria-label="Teleprompter"
    >
      {camOn ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-30"
        />
      ) : stillUrl ? (
        <img
          src={stillUrl}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
        />
      ) : null}
      <div className="relative z-20 flex items-center justify-between gap-3 px-5 py-4">
        <p className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
          Teleprompter · {beat.start}–{beat.end}s · {beat.label}
          {recording ? " · REC" : ""}
        </p>
        <div className="relative z-20 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPlaying((value) => !value)}>
            {playing ? "Pause" : "Play"}
          </Button>
          {camOn ? (
            <>
              {recording ? (
                <Button variant="paper" onClick={stopRec}>
                  Stop take
                </Button>
              ) : (
                <Button variant="paper" onClick={startRec}>
                  Record take
                </Button>
              )}
              <Button variant="outline" onClick={stopCam}>
                Camera off
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => void startCam()}>
              Webcam
            </Button>
          )}
          <Button variant="paper" data-testid="teleprompter-exit" onClick={onClose}>
            Exit
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="relative z-0 flex flex-1 flex-col items-center justify-center px-6 text-center"
        onClick={() => setIndex((value) => Math.min(ad.beats.length - 1, value + 1))}
      >
        <p className="max-w-4xl font-display text-4xl leading-tight italic md:text-6xl">
          {beat.line}
        </p>
        <p className="mt-8 max-w-xl text-sm text-fg-muted">{beat.visual}</p>
      </button>
      <div className="relative z-20 flex justify-center gap-2 px-5 py-6">
        {ad.beats.map((item, i) => (
          <button
            key={`${item.start}-${item.label}`}
            type="button"
            aria-label={`Beat ${i + 1}`}
            onClick={() => {
              setPlaying(false);
              setIndex(i);
            }}
            className={`h-2 w-8 rounded-full ${i === index ? "bg-paper" : "bg-border-strong"}`}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
