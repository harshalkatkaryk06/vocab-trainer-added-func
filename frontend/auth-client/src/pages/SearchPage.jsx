import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import WordCard from "../components/WordCard";
import { saveWord, searchWord } from "../api/words";
import { useAuth } from "../context/AuthContext";
import { libraryQueryKey, useLibrary } from "../queries/library";

const SUGGESTED_WORDS = [
  "ephemeral",
  "serendipity",
  "eloquent",
  "resilience",
  "mellifluous",
  "lucid",
  "pragmatic",
  "petrichor",
];

const WORD_TRAILS = [
  { title: "Nature", words: ["apricity", "susurrus", "crepuscular"] },
  { title: "Feelings", words: ["sonder", "limerence", "hiraeth"] },
  { title: "Expression", words: ["laconic", "ineffable", "incisive"] },
];

const WORD_SPOTLIGHTS = [
  {
    word: "halcyon",
    partOfSpeech: "adjective",
    meaning: "Calm, peaceful, and happy, often describing an idealized time or place.",
  },
  {
    word: "gossamer",
    partOfSpeech: "adjective",
    meaning: "Delicate, light, and sheer, like a fine spider's web.",
  },
  {
    word: "penumbra",
    partOfSpeech: "noun",
    meaning: "The partially shaded area between full light and complete shadow.",
  },
  {
    word: "ebullient",
    partOfSpeech: "adjective",
    meaning: "Cheerful, energetic, and full of enthusiasm.",
  },
  {
    word: "lambent",
    partOfSpeech: "adjective",
    meaning: "Glowing softly or moving gently over a surface.",
  },
  {
    word: "quiescent",
    partOfSpeech: "adjective",
    meaning: "Quiet, still, or temporarily inactive.",
  },
  {
    word: "resplendent",
    partOfSpeech: "adjective",
    meaning: "Impressive in appearance, especially because of rich color or decoration.",
  },
];

export default function Search() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [correctedFrom, setCorrectedFrom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  const search = async (overrideQuery, forceExact = false) => {
    const term = (overrideQuery ?? query).trim();
    if (!term || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);
    setCorrectedFrom(null);
    try {
      const response = await searchWord(term, forceExact);
      if (response.data.success) {
        setResult(response.data);
        setCorrectedFrom(forceExact ? null : response.data.correctedFrom || null);
      } else {
        setError(response.data.message || "We couldn't find that word.");
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!result || saving || saved) return;
    setSaving(true);
    setError("");
    try {
      const response = await saveWord(result.data);
      if (response.data.success) {
        setSaved(true);
        const savedWord = response.data.data;
        const queryKey = libraryQueryKey(user?.id);
        const currentLibrary = queryClient.getQueryData(queryKey);
        if (currentLibrary) {
          const updatedAt = queryClient.getQueryState(queryKey)?.dataUpdatedAt;
          queryClient.setQueryData(
            queryKey,
            (current) => current.some((item) => item._id === savedWord._id)
              ? current
              : [savedWord, ...current],
            { updatedAt }
          );
        } else {
          await queryClient.invalidateQueries({ queryKey });
        }
      } else {
        setError(response.data.message || "Could not save this word.");
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not save this word.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const savedWords = useMemo(
    () => library.map((word) => word.word.toLowerCase()),
    [library]
  );
  const availableWords = useMemo(
    () => SUGGESTED_WORDS.filter((word) => !savedWords.includes(word)),
    [savedWords]
  );
  const availableTrails = useMemo(
    () => WORD_TRAILS.map((trail) => ({
      ...trail,
      words: trail.words.filter((word) => !savedWords.includes(word)),
    })).filter((trail) => trail.words.length > 0),
    [savedWords]
  );
  const wordSpotlight = useMemo(() => {
    return WORD_SPOTLIGHTS.find((candidate) => !savedWords.includes(candidate.word))
      ?? WORD_SPOTLIGHTS[0];
  }, [savedWords]);
  const resultWord = result?.data?.word;

  return (
    <main className="vt-page-wrap vt-search-page">
      <header className="vt-page-heading vt-search-heading">
        <p className="vt-eyebrow">Explore</p>
        <h1>Find the right word.</h1>
        <p>Look up a word, understand how it works, and keep it close.</p>
      </header>

      <form
        className="vt-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label className="vt-search-field">
          <span className="vt-sr-only">Search for a word</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try a word you’ve been wondering about"
            autoComplete="off"
          />
          {query && (
            <button type="button" className="vt-clear-search" onClick={() => setQuery("")}>
              Clear
            </button>
          )}
        </label>
        <button className="vt-button-primary vt-search-submit" type="submit" disabled={loading || !query.trim()}>
          {loading ? "Looking it up…" : "Search"}
          {!loading && <span aria-hidden="true">→</span>}
        </button>
      </form>

      {!result && !loading && availableWords.length > 0 && (
        <section className="vt-suggestions" aria-label="Suggested words">
          <span className="vt-eyebrow">A few words to explore</span>
          <div className="vt-suggestion-list">
            {availableWords.slice(0, 6).map((word) => (
              <button
                type="button"
                key={word}
                onClick={() => {
                  setQuery(word);
                  search(word);
                }}
              >
                {word}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!result && !loading && availableTrails.length > 0 && (
        <section className="vt-word-trails" aria-label="Explore words by theme">
          <p className="vt-eyebrow">Explore by theme</p>
          <div className="vt-word-trail-list">
            {availableTrails.map((trail) => (
              <div className="vt-word-trail" key={trail.title}>
                <h2>{trail.title}</h2>
                <div>
                  {trail.words.map((word) => (
                    <button
                      type="button"
                      key={word}
                      onClick={() => {
                        setQuery(word);
                        search(word);
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!result && !loading && (
        <section className="vt-word-spotlight" aria-label="Word spotlight">
          <div>
            <p className="vt-eyebrow">Word spotlight</p>
            <div className="vt-word-spotlight-title">
              <h2>{wordSpotlight.word}</h2>
              <span>{wordSpotlight.partOfSpeech}</span>
            </div>
            <p className="vt-word-spotlight-meaning">{wordSpotlight.meaning}</p>
          </div>
          <button
            type="button"
            className="vt-button-primary"
            onClick={() => {
              setQuery(wordSpotlight.word);
              search(wordSpotlight.word);
            }}
          >
            Explore this word <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {error && <p className="vt-inline-error" role="alert">{error}</p>}

      {loading && (
        <div className="vt-search-loading" role="status" aria-live="polite">
          <span className="vt-loading-dot" />
          <span>Checking your library, then looking up the word…</span>
        </div>
      )}

      {result && !loading && correctedFrom && resultWord && (
        <div className="vt-correction-note">
          <p>Showing results for <strong>{resultWord}</strong>.</p>
          <button type="button" onClick={() => {
            setQuery(correctedFrom);
            search(correctedFrom, true);
          }}>
            Search for “{correctedFrom}” instead
          </button>
        </div>
      )}

      {result && !loading && (
        <section className="vt-search-result" aria-label={`Definition of ${result.data.word}`}>
          <WordCard
            data={result.data}
            source={result.source}
            onSave={save}
            saving={saving}
            saved={saved}
          />
        </section>
      )}

      {!result && !loading && (
        <aside className="vt-search-note">
          <span className="vt-search-note-mark" aria-hidden="true">i</span>
          <p>Words you’ve already saved are checked first, so you can revisit them without spending an AI search.</p>
        </aside>
      )}
    </main>
  );
}
