import { useState, useEffect } from "react";
import LibraryWordCard from "../components/LibraryWordCard";
import { getLibrary, deleteWord } from "../api/words";
import DeleteConfirmModal from "../components/ConfirmDeleteModal";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PAGE_SIZE = 6;

const FILTERS = [
  "all",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "idiom",
];

export default function Library() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [library, setLibrary] = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [libSearch, setLibSearch] = useState("");
  const [page, setPage] = useState(0);

  const loadLibrary = async () => {
    setLibLoading(true);
    try {
      const res = await getLibrary();
      if (res.data.success) setLibrary(res.data.data);
    } catch (_) {}
    setLibLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedWord) return;
    setDeleting(selectedWord._id);
    try {
      await deleteWord(selectedWord._id);
      setLibrary((prev) => prev.filter((w) => w._id !== selectedWord._id));
      setShowDeleteModal(false);
      setSelectedWord(null);
    } catch (error) {
      console.error(error);
    }
    setDeleting(null);
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const filteredLib = library.filter((w) => {
    const matchesSearch = w.word.toLowerCase().includes(libSearch.toLowerCase());
    const matchesFilter =
      activeFilter === "all"
        ? true
        : (w.partOfSpeech || "").toLowerCase().includes(activeFilter);
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLib.length / PAGE_SIZE));

  // Reset to first page on a new filter/search; clamp if the current page overflows.
  useEffect(() => { setPage(0); }, [libSearch, activeFilter]);
  useEffect(() => { if (page > totalPages - 1) setPage(totalPages - 1); }, [page, totalPages]);

  const pageItems = filteredLib.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pb-16 pt-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className={`${SERIF} m-0 text-[clamp(40px,6vw,64px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#ededf2]`}>
            Your Library
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#9a9aae]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5ee08a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {library.length} word{library.length !== 1 ? "s" : ""} saved in your cosmic archive
          </p>
        </div>

        {/* Search + filters column */}
        <div className="w-full sm:w-[360px]">
          {/* Search input — its own relative wrapper so the icon stays inside it */}
          <div className="relative w-full">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#6a6a7c" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
              placeholder="Filter your lexicon..."
              className="w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] py-3 pl-11 pr-4 text-sm text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]"
            />
          </div>

          {/* Filter chips — sibling of the input, not nested inside it */}
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => { setActiveFilter(filter); setPage(0); }}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-all ${
                  activeFilter === filter
                    ? "border border-[rgba(124,108,255,0.45)] bg-[rgba(124,108,255,0.18)] text-[#b6abff]"
                    : "border border-white/[0.08] text-[#9a9aae] hover:border-[rgba(124,108,255,0.25)] hover:text-[#b6abff]"
                }`}
              >
                {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {libLoading && <div className="p-12 text-center text-[#9a9aae]">Loading your library…</div>}

      {!libLoading && filteredLib.length === 0 && (
        <div className="rounded-[18px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] px-8 py-16 text-center">
          <div className="mb-3.5 text-[40px]">📖</div>
          <p className="m-0 text-base text-[#9a9aae]">
            {libSearch || activeFilter !== "all"
              ? "No words match the selected filters."
              : "Your library is empty. Search a word and save it!"}
          </p>
        </div>
      )}

      {/* Grid: 6 cards per page, 2 columns */}
      {!libLoading && pageItems.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pageItems.map((w) => (
            <LibraryWordCard
              key={w._id}
              word={w}
              deleting={deleting}
              onDelete={() => {
                setSelectedWord(w);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            className={`flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] transition-all ${
              page === 0
                ? "cursor-not-allowed border-white/[0.06] text-[#3a3a48]"
                : "cursor-pointer border-white/[0.1] text-[#9a9aae] hover:border-[rgba(124,108,255,0.5)] hover:text-[#b6abff]"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <span className="min-w-[96px] text-center text-[13px] text-[#6a6a7c]">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className={`inline-flex items-center gap-2 rounded-full border-[0.5px] px-5 py-2.5 text-sm font-medium transition-all ${
              page >= totalPages - 1
                ? "cursor-not-allowed border-white/[0.06] text-[#3a3a48]"
                : "cursor-pointer border-[rgba(124,108,255,0.4)] bg-[rgba(124,108,255,0.08)] text-[#b6abff] hover:-translate-y-px"
            }`}
          >
            Discover More Stars
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        word={selectedWord?.word}
        loading={deleting === selectedWord?._id}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedWord(null);
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}