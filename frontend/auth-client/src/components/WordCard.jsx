import { useState } from "react";
import SpeakButton from "./SpeakButton";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

// Highlights occurrences of the searched word inside an example sentence.
function highlight(text, word) {
  if (!word) return text;
  const parts = String(text).split(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <strong key={i} className="font-bold not-italic text-[#b6abff]">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export default function WordCard({ data, source, onSave, saving, saved }) {
  const [tab, setTab] = useState("definition");
  const [copied, setCopied] = useState(false);

  const tabs = ["definition", "examples"];
  if (data.etymology) tabs.push("etymology");

  const copyToClipboard = async () => {
    const text = `${data.word}${data.primaryDefinition ? " — " + data.primaryDefinition : ""}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure origins (e.g. http LAN IP)
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };

  const isLibrary = source === "library";

  return (
    <div className="overflow-hidden rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.03)] animate-[cardIn_0.4s_cubic-bezier(0.16,1,0.3,1)]">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr]">
        {/* ── Left column: word identity ── */}
        <div className="border-b border-white/[0.05] p-8 md:border-b-0 md:border-r md:pl-9">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border-[0.5px] px-[11px] py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                isLibrary
                  ? "border-[rgba(124,108,255,0.3)] bg-[rgba(124,108,255,0.12)] text-[#b6abff]"
                  : "border-[rgba(94,224,138,0.25)] bg-[rgba(46,184,114,0.14)] text-[#5ee08a]"
              }`}
            >
              {isLibrary ? "📚 In library" : "✦ AI defined"}
            </span>
            {data.partOfSpeech && (
              <span className="rounded-full border-[0.5px] border-white/[0.07] bg-[#15151f] px-[11px] py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#9a9aae]">
                {data.partOfSpeech}
              </span>
            )}
          </div>

          <h2
            className={`${SERIF} m-0 mb-3.5 break-words bg-gradient-to-br from-[#c9c0ff] via-[#7c6cff] to-[#5b4fd6] bg-clip-text text-[52px] font-extrabold leading-[1.02] tracking-[-0.015em] text-transparent`}
          >
            {data.word}
          </h2>

          {(data.pronunciationReadable || data.pronunciation) && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {data.pronunciationReadable && (
                <span className={`${SERIF} text-base italic text-[#9a9aae]`}>
                  /{data.pronunciationReadable}/
                </span>
              )}
              {data.pronunciation && (
                <span className="text-[12.5px] tracking-[0.04em] text-[#6a6a7c]">
                  {data.pronunciation}
                </span>
              )}
              <SpeakButton word={data.word} />
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            {source === "ai" && (
              <button
                onClick={onSave}
                disabled={saving || saved}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-5 py-[11px] text-[13.5px] font-semibold transition-all ${
                  saving ? "opacity-70" : ""
                } ${
                  saved
                    ? "cursor-default border-[0.5px] border-[rgba(94,224,138,0.3)] bg-[rgba(94,224,138,0.14)] text-[#5ee08a]"
                    : "cursor-pointer bg-[#7c6cff] text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)]"
                }`}
              >
                {saved ? "✓ Saved" : saving ? "Saving…" : "🔖 Save Word"}
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border-[0.5px] border-white/[0.07] bg-transparent px-5 py-[11px] text-[13.5px] font-medium text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* ── Right column: tabs + content ── */}
        <div className="px-9 pb-8 pt-6">
          <div className="mb-[22px] flex gap-1 border-b border-white/[0.05]">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px cursor-pointer border-b-2 bg-transparent px-3.5 py-2.5 text-[13px] font-semibold tracking-[0.01em] transition-colors ${
                  tab === t ? "border-[#7c6cff] text-[#b6abff]" : "border-transparent text-[#6a6a7c]"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "definition" && (
            <p className={`${SERIF} m-0 text-[26px] font-semibold leading-[1.42] tracking-[-0.01em] text-[#ededf2]`}>
              {data.primaryDefinition}
            </p>
          )}

          {tab === "examples" && (
            <div className="flex flex-col gap-3">
              {(data.examples || []).length === 0 && (
                <p className="m-0 text-sm italic text-[#6a6a7c]">No examples available.</p>
              )}
              {(data.examples || []).map((ex, i) => (
                <div key={i} className="rounded-r-[10px] border-l-2 border-[#7c6cff] bg-[#15151f] px-[18px] py-3.5">
                  <p className="m-0 text-[15px] italic leading-[1.65] text-[#9a9aae]">
                    "{highlight(ex, data.word)}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "etymology" && (
            <p className="m-0 text-[15.5px] leading-[1.75] text-[#9a9aae]">{data.etymology}</p>
          )}
        </div>
      </div>
    </div>
  );
}