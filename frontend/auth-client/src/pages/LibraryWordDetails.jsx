import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SpeakButton from "../components/SpeakButton";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { deleteWord } from "../api/words";
import { useAuth } from "../context/AuthContext";
import { libraryQueryKey } from "../queries/library";

export default function LibraryWordDetails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const word = location.state?.word;

  const handleDelete = async () => {
    if (!word || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await deleteWord(word._id);
      if (!response.data.success) {
        setError(response.data.message || "Could not remove this word.");
        return;
      }
      queryClient.setQueryData(libraryQueryKey(user?.id), (current) =>
        current?.filter((item) => item._id !== word._id)
      );
      navigate("/library");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not remove this word.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!word) {
    return (
      <main className="vt-page-wrap vt-detail-page">
        <Link to="/library" className="vt-link">← Back to your library</Link>
        <section className="vt-library-empty">
          <h1>Word not available</h1>
          <p>Return to your library and open a saved word from there.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="vt-page-wrap vt-detail-page">
      <button type="button" className="vt-detail-back" onClick={() => navigate(-1)}>
        ← Back to your library
      </button>

      <article className="vt-detail-card">
        <header className="vt-detail-header">
          <div className="vt-detail-heading">
            <p className="vt-eyebrow">Saved word</p>
            <h1 className="vt-word-serif">{word.word}</h1>
            <div className="vt-library-word-meta">
              {word.type && <span className="vt-word-pos">{word.type}</span>}
              {word.partOfSpeech && <span className="vt-word-pos">{word.partOfSpeech}</span>}
              {word.pronunciationReadable && <span>/{word.pronunciationReadable}/</span>}
            </div>
            {word.pronunciation && <p className="vt-detail-ipa">{word.pronunciation}</p>}
          </div>
          <div className="vt-detail-actions">
            <SpeakButton word={word.word} />
            <button type="button" className="vt-detail-delete" onClick={() => setShowDeleteModal(true)}>
              Remove word
            </button>
          </div>
        </header>

        {error && <p className="vt-inline-error" role="alert">{error}</p>}

        <section className="vt-detail-section">
          <p className="vt-eyebrow">Meaning</p>
          <p className="vt-detail-definition">{word.primaryDefinition}</p>
        </section>

        {word.examples?.length > 0 && (
          <section className="vt-detail-section">
            <p className="vt-eyebrow">In context</p>
            <div className="vt-detail-examples">
              {word.examples.map((example, index) => (
                <blockquote key={index}>{example}</blockquote>
              ))}
            </div>
          </section>
        )}
      </article>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Remove saved word?"
        message={`“${word.word}” will be removed from your library.`}
        loading={deleting}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
