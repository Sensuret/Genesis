"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { balanceAnnouncementText, pickBankingVoice } from "@/lib/balance-speech";
import { cn } from "@/lib/utils";

export function BalanceSpeakButton({
  amount,
  currency,
  className
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesReady = useRef(false);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setPlaying(false);
  }, []);

  const startUtterance = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const text = balanceAnnouncementText(amount, currency);
    const utter = new SpeechSynthesisUtterance(text);
    utterRef.current = utter;

    const voices = window.speechSynthesis.getVoices();
    const voice = pickBankingVoice(voices);
    if (voice) utter.voice = voice;

    // Slightly slower, neutral — closer to automated bank IVR than default browser chatter.
    utter.rate = 1.05;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => {
      utterRef.current = null;
      setPlaying(false);
    };
    utter.onerror = () => {
      utterRef.current = null;
      setPlaying(false);
    };

    setPlaying(true);
    window.speechSynthesis.speak(utter);
  }, [amount, currency]);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stop();

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      const onVoices = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        startUtterance();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      window.speechSynthesis.getVoices();
      return;
    }
    startUtterance();
  }, [stop, startUtterance]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      voicesReady.current = window.speechSynthesis.getVoices().length > 0;
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      stop();
    };
  }, [stop]);

  const toggle = useCallback(() => {
    if (playing) stop();
    else speak();
  }, [playing, speak, stop]);

  if (!Number.isFinite(amount)) return null;

  return (
    <button
      type="button"
      title={playing ? "Stop balance announcement" : "Play balance announcement"}
      aria-label={playing ? "Stop balance announcement" : "Play balance announcement"}
      aria-pressed={playing}
      onClick={toggle}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-elevated text-fg-muted transition hover:border-brand-400 hover:text-brand-300",
        playing && "border-brand-400/60 text-brand-300",
        className
      )}
    >
      {playing ? (
        <Square className="h-3 w-3 fill-current" aria-hidden />
      ) : (
        <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
      )}
    </button>
  );
}
