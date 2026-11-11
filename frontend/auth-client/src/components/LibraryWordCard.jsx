import SpeakButton from "./SpeakButton";
import { useNavigate } from "react-router-dom";

const POS_ABBR = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  pronoun: "pron.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
};

export default function LibraryWordCard({ word, onDelete, deleting }) {
  const navigate = useNavigate();
  const pos = POS_ABBR[word.partOfSpeech?.toLowerCase()] || word.partOfSpeech;
  const isDeleting = deleting === word._id;

  return (
    <div
      onClick={() =>
        navigate(`/library/${word._id}`, {
          state: { word },
        })
      }
      className="relative overflow-hidden rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] py-5 pl-6 pr-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)] transition-all cursor-pointer animate-[cardIn_0.3s_ease] hover:border-[rgba(124,108,255,0.28)] hover:-translate-y-1"
    >
      {/* Accent strip */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-[#7c6cff]" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#ededf2]">
            {word.word}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            {pos && (
              <span className="rounded-[6px] border-[0.5px] border-white/[0.07] bg-[#15151f] px-2 py-[2px] text-[11px] italic text-[#9a9aae]">
                {pos}
              </span>
            )}
            {word.pronunciationReadable && (
              <span className="text-[13px] tracking-[0.02em] text-[#6a6a7c]">
                /{word.pronunciationReadable}/
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            onClick={(e) => e.stopPropagation()}
          >
            <SpeakButton word={word.word} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(word._id);
            }}
            disabled={isDeleting}
            aria-label={`Remove ${word.word}`}
            title="Remove"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[0.5px] border-white/[0.07] bg-white/[0.02] text-[#6a6a7c] transition-all hover:border-[rgba(255,123,123,0.4)] hover:text-[#ff7b7b] disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="inline-block animate-spin text-[13px]">⟳</span>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}