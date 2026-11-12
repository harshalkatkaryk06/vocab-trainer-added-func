import { Link } from "react-router-dom";
import SpeakButton from "./SpeakButton";

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
  const pos = POS_ABBR[word.partOfSpeech?.toLowerCase()] || word.partOfSpeech;
  const isDeleting = deleting === word._id;

  return (
    <article className="vt-library-row">
      <div className="vt-library-word-main">
        <Link
          to={`/library/${word._id}`}
          state={{ word }}
          className="vt-library-word-link"
          aria-label={`Open ${word.word}`}
        >
          <span className="vt-library-word-title">{word.word}</span>
          {word.primaryDefinition && (
            <span className="vt-library-word-definition">{word.primaryDefinition}</span>
          )}
        </Link>
        <div className="vt-library-word-meta">
          {pos && <span className="vt-word-pos">{pos}</span>}
          {word.pronunciationReadable && <span>/{word.pronunciationReadable}/</span>}
        </div>
      </div>

      <div className="vt-library-row-actions">
        <SpeakButton word={word.word} />
        <button
          type="button"
          onClick={() => onDelete(word._id)}
          disabled={isDeleting}
          aria-label={`Remove ${word.word}`}
          className="vt-icon-button vt-delete-word"
        >
          {isDeleting ? "…" : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
}
