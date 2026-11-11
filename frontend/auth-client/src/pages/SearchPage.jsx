import { useState, useEffect, useRef, useMemo } from "react";
import WordCard from "../components/WordCard";
import { searchWord, saveWord, getLibrary } from "../api/words";

const TIPS = [
  "Try searching for words you've recently read but didn't fully understand.",
  "Save words to your library and review them later.",
  "Each search checks your library first — no AI credits wasted.",
  "Build a library of 10 words this week as a personal challenge.",
];

const SUGGESTED = [
  "ephemeral", "serendipity", "loquacious", "melancholy", "ubiquitous", "paradox",
  "eloquent", "resilience", "ineffable", "mellifluous", "petrichor", "sonder",
  "limerence", "ebullient", "halcyon", "quintessential", "surreptitious", "idiosyncratic",
  "perfunctory", "magnanimous", "esoteric", "voracious", "gregarious", "lucid",
  "fastidious", "vicarious", "nebulous", "cogent", "pragmatic", "luminous",
];

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PILL =
  "cursor-pointer rounded-[22px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-[7px] text-[13.5px] text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.5)] hover:text-[#b6abff]";

export default function Search() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [correctedFrom, setCorrectedFrom] = useState(null); // original input if AI corrected it
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedWords, setSavedWords] = useState([]); // lowercased words already in the library
  const inputRef = useRef(null);

  // forceExact = true → tell the search to skip correction and use the typed term verbatim
  const search = async (overrideQuery, forceExact = false) => {
    const term = (overrideQuery ?? query).trim();
    if (!term) return;
    setLoading(true); setError(""); setResult(null); setSaved(false); setCorrectedFrom(null);
    try {
      const res = await searchWord(term, forceExact);
      if (res.data.success) {
        setResult(res.data);
        // Only surface a correction when the user didn't force the exact term.
        setCorrectedFrom(forceExact ? null : res.data.correctedFrom || null);
      } else {
        setError(res.data.message || "Something went wrong");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await saveWord(result.data);
      if (res.data.success) {
        setSaved(true);
        const w = result.data.word?.toLowerCase();
        if (w) setSavedWords((prev) => (prev.includes(w) ? prev : [...prev, w]));
      } else {
        setError(res.data.message || "Could not save");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save");
    }
    setSaving(false);
  };

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    // Load the user's library so we can hide words they've already saved.
    (async () => {
      try {
        const res = await getLibrary();
        if (res.data.success) {
          setSavedWords(res.data.data.map((w) => w.word.toLowerCase()));
        }
      } catch (_) {}
    })();
  }, []);

  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  // Only suggest words the user hasn't saved yet.
  const available = SUGGESTED.filter((w) => !savedWords.includes(w));

  const correctedWord = result?.data?.word;

  return (
    <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pb-16 pt-12">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className={`${SERIF} m-0 mb-3.5 text-[clamp(48px,7vw,84px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#ededf2]`}>
          Discover a new word
        </h1>
        <p className="m-0 text-base text-[#9a9aae]">The universe of language is yours to explore.</p>
      </div>

      {/* Search input + button */}
      <div className="mx-auto max-w-[640px]">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Type a word…"
          className={`${SERIF} w-full rounded-[14px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-[22px] py-[18px] text-center text-[22px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]`}
        />
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => search()}
            disabled={loading}
            className={`inline-flex cursor-pointer items-center gap-2.5 rounded-[30px] bg-gradient-to-br from-[#cfc8ff] to-[#a99eff] px-[38px] py-3.5 text-base font-semibold text-[#2b1a6b] shadow-[0_0_0_6px_rgba(124,108,255,0.10),0_14px_36px_-10px_rgba(124,108,255,0.75)] transition-transform hover:-translate-y-px ${
              loading ? "opacity-70" : ""
            }`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Commonly sought (only words not yet saved) */}
        {available.length > 0 && (
          <div className="mt-[30px] flex flex-wrap items-center justify-center gap-2.5">
            <span className="mr-1 text-[13.5px] text-[#6a6a7c]">Commonly sought:</span>
            {available.slice(0, 4).map(w => (
              <button key={w} onClick={() => { setQuery(w); search(w); }} className={PILL}>
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto mt-8 max-w-[760px] rounded-xl border-[0.5px] border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] px-[18px] py-[13px] text-sm text-[#ff7b7b]">
          {error}
        </div>
      )}

      {loading && (
        <div className="pb-8 pt-16 text-center text-[#9a9aae]">
          <div className="mb-3.5 inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
          <p className="text-sm">Checking your library, then asking AI if needed…</p>
        </div>
      )}

      {/* Spelling correction — "Showing results for X" (Google style) */}
      {result && !loading && correctedFrom && correctedWord && (
        <div className="mx-auto mt-10 max-w-[960px] text-[15px] leading-relaxed">
          <p className="m-0 text-[#ededf2]">
            Showing results for{" "}
            <button
              onClick={() => { setQuery(correctedWord); search(correctedWord, true); }}
              className={`${SERIF} cursor-pointer border-none bg-transparent p-0 text-[18px] font-bold italic text-[#b6abff] underline decoration-[rgba(182,171,255,0.4)] underline-offset-4 hover:decoration-[#b6abff]`}
            >
              {correctedWord}
            </button>
          </p>
          <p className="m-0 mt-1 text-[13.5px] text-[#6a6a7c]">
            Search instead for{" "}
            <button
              onClick={() => { setQuery(correctedFrom); search(correctedFrom, true); }}
              className="cursor-pointer border-none bg-transparent p-0 text-[13.5px] text-[#9a9aae] underline underline-offset-2 hover:text-[#b6abff]"
            >
              {correctedFrom}
            </button>
          </p>
        </div>
      )}

      {result && !loading && (
        <div className={`mx-auto max-w-[960px] ${correctedFrom ? "mt-5" : "mt-12"}`}>
          <WordCard data={result.data} source={result.source} onSave={save} saving={saving} saved={saved} />
        </div>
      )}

      {/* More words to try (only when idle, and only unsaved words beyond the first 4) */}
      {!result && !loading && available.length > 4 && (
        <div className="mx-auto mt-10 max-w-[640px]">
          <div className="mb-3 text-center text-[11.5px] uppercase tracking-[0.12em] text-[#6a6a7c]">
            More words to explore
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {available.slice(4, 10).map(w => (
              <button key={w} onClick={() => { setQuery(w); search(w); }} className={PILL}>
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Learning tip */}
      <div className="mx-auto mt-12 max-w-[720px]">
        <div className="flex items-start gap-4 rounded-2xl border-[0.5px] border-[rgba(124,108,255,0.22)] bg-[rgba(124,108,255,0.08)] px-6 py-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#7c6cff] text-lg">
            💡
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#b6abff]">
              Learning tip
            </div>
            <p className="m-0 text-[15px] leading-[1.65] text-[#9a9aae]">{tip}</p>
          </div>
        </div>
      </div>
    </main>
  );
}