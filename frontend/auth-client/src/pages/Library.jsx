import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import LibraryWordCard from "../components/LibraryWordCard";
import DeleteConfirmModal from "../components/ConfirmDeleteModal";
import { deleteWord } from "../api/words";
import { useAuth } from "../context/AuthContext";
import { libraryQueryKey, useLibrary } from "../queries/library";

const PAGE_SIZE = 6;
const FILTERS = [
  "all", "noun", "verb", "adjective", "adverb", "pronoun",
  "preposition", "conjunction", "interjection", "phrase", "idiom",
];

export default function Library() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: library = [],
    isPending: loading,
    error: loadError,
    refetch,
  } = useLibrary(user?.id);
  const [activeFilter, setActiveFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const handleDelete = async () => {
    if (!selectedWord || deleting) return;
    setDeleting(selectedWord._id);
    setActionError("");
    try {
      const response = await deleteWord(selectedWord._id);
      if (!response.data.success) {
        setActionError(response.data.message || "Could not remove this word.");
        setSelectedWord(null);
        return;
      }
      queryClient.setQueryData(libraryQueryKey(user?.id), (current = []) =>
        current.filter((word) => word._id !== selectedWord._id)
      );
      setSelectedWord(null);
    } catch (requestError) {
      setActionError(requestError?.response?.data?.message || "Could not remove this word.");
    } finally {
      setDeleting(null);
    }
  };

  const error = actionError || loadError?.response?.data?.message || loadError?.message || "";

  const filteredWords = useMemo(() => library.filter((word) => {
    const matchesSearch = word.word.toLowerCase().includes(search.trim().toLowerCase());
    const matchesPartOfSpeech = activeFilter === "all" ||
      (word.partOfSpeech || "").toLowerCase().includes(activeFilter);
    return matchesSearch && matchesPartOfSpeech;
  }), [library, search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages - 1);
  const pageItems = filteredWords.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  return (
    <main className="vt-page-wrap vt-library-page">
      <header className="vt-library-header">
        <div>
          <p className="vt-eyebrow">Your collection</p>
          <h1 className="vt-page-title">My library</h1>
          <p className="vt-library-count">
            {library.length} {library.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <Link to="/" className="vt-button-primary">
          Find a word <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="vt-library-tools" aria-label="Find and filter saved words">
        <label className="vt-library-search">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="vt-sr-only">Search your library</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search saved words"
          />
        </label>
        <div className="vt-library-filters" aria-label="Filter by part of speech">
          {FILTERS.map((filter) => (
            <button
              type="button"
              key={filter}
              aria-pressed={activeFilter === filter}
              className={activeFilter === filter ? "is-active" : ""}
              onClick={() => {
                setActiveFilter(filter);
                setPage(0);
              }}
            >
              {filter === "all" ? "All words" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="vt-library-error" role="alert">
          <span>{error}</span>
          {library.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setActionError("");
                refetch();
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="vt-library-state" role="status">Loading your saved words…</div>
      ) : pageItems.length ? (
        <>
          <div className={`vt-library-list${pageItems.length >= 5 ? " is-roomy" : ""}`}>
            {pageItems.map((word) => (
              <LibraryWordCard
                key={word._id}
                word={word}
                deleting={deleting}
                onDelete={() => setSelectedWord(word)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="vt-pagination" aria-label="Library pages">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, pageIndex - 1))}
                disabled={pageIndex === 0}
              >
                Previous
              </button>
              <span>Page {pageIndex + 1} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages - 1, pageIndex + 1))}
                disabled={pageIndex >= totalPages - 1}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="vt-library-empty">
          <span className="vt-library-empty-mark" aria-hidden="true">Aa</span>
          <h2>{search || activeFilter !== "all" ? "No words match that view" : "Your library starts with one word"}</h2>
          <p>
            {search || activeFilter !== "all"
              ? "Try a different search or filter."
              : "Save words as you explore, then come back to practice them here."}
          </p>
          {!search && activeFilter === "all" && (
            <Link to="/" className="vt-button-primary">Explore words</Link>
          )}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(selectedWord)}
        title="Remove saved word?"
        message={selectedWord ? `“${selectedWord.word}” will be removed from your library.` : ""}
        loading={deleting === selectedWord?._id}
        onClose={() => setSelectedWord(null)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
