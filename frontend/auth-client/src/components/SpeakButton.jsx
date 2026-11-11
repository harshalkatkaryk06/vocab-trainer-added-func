import { useState } from "react";

// Drop-in replacement for the original SpeakButton.
// Usage unchanged: <SpeakButton word={...} />
export default function SpeakButton({ word }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!word || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = "en-US";
      utter.rate = 0.92;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch (_) {
      setSpeaking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`Pronounce ${word}`}
      title="Pronounce"
      className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border-[0.5px] border-[rgba(124,108,255,0.45)] text-[#b6abff] transition-colors hover:bg-[rgba(124,108,255,0.24)] ${
        speaking
          ? "bg-[rgba(124,108,255,0.28)] animate-[speakPulse_1s_ease-in-out_infinite]"
          : "bg-[rgba(124,108,255,0.12)]"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>

      <style>{`
        @keyframes speakPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,108,255,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(124,108,255,0); }
        }
      `}</style>
    </button>
  );
}