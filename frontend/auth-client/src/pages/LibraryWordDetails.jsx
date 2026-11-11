import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeakButton from "../components/SpeakButton";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { deleteWord } from "../api/words";

const SERIF =
  "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

export default function LibraryWordDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const word = location.state?.word;

  const handleDelete = async () => {
    try {
      setDeleting(true);

      await deleteWord(word._id);

      navigate("/library");
    } catch (error) {
      console.error("Delete Word Error:", error);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!word) {
    return (
      <div className="p-10 text-center text-white">
        Word not found
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 text-sm text-[#9a9aae] transition-colors hover:text-white"
        >
          ← Back
        </button>

        <div className="rounded-2xl border border-white/10 bg-[#0f0f18] p-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1
                className={`${SERIF} bg-gradient-to-r from-[#f3c969] to-[#df9a31] bg-clip-text text-5xl font-bold text-transparent`}
              >
                {word.word}
              </h1>

              <div className="mt-4 flex flex-wrap gap-3">
                {word.type && (
                  <span className="rounded-lg bg-[#171722] px-3 py-1 text-sm text-[#9a9aae]">
                    {word.type}
                  </span>
                )}

                {word.partOfSpeech && (
                  <span className="rounded-lg bg-[#171722] px-3 py-1 text-sm text-[#9a9aae]">
                    {word.partOfSpeech}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <SpeakButton word={word.word} />

              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>

                Delete
              </button>
            </div>
          </div>

          {/* Definition */}
          <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Definition
            </h3>

            <p className="leading-relaxed text-[#c9c9d6]">
              {word.primaryDefinition}
            </p>
          </div>

          {/* Pronunciation */}
          {(word.pronunciation || word.pronunciationReadable) && (
            <div className="mt-8">
              <h3 className="mb-2 text-lg font-semibold text-white">
                Pronunciation
              </h3>

              {word.pronunciation && (
                <p className="text-[#c9c9d6]">
                  {word.pronunciation}
                </p>
              )}

              {word.pronunciationReadable && (
                <p className="mt-1 text-[#9a9aae]">
                  {word.pronunciationReadable}
                </p>
              )}
            </div>
          )}

          {/* Examples */}
          {word.examples?.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-lg font-semibold text-white">
                Examples
              </h3>

              <ul className="space-y-3">
                {word.examples.map((ex, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-white/5 bg-[#171722] p-4 text-[#c9c9d6]"
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        loading={deleting}
        title="Delete Word"
        message={`Are you sure you want to delete "${word.word}" from your library? This action cannot be undone.`}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}