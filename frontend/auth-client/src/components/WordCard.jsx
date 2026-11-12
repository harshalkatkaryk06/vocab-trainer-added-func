import { useState } from "react";
import SpeakButton from "./SpeakButton";

function highlight(text, word) {
  if (!word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text).split(new RegExp(`(${escaped})`, "ig")).map((part, index) =>
    part.toLowerCase() === word.toLowerCase()
      ? <strong key={index}>{part}</strong>
      : part
  );
}

export default function WordCard({ data, source, onSave, saving, saved }) {
  const [tab, setTab] = useState("definition");
  const [copied, setCopied] = useState(false);
  const isLibrary = source === "library";
  const tabs = ["definition", "examples"];
  if (data.etymology) tabs.push("etymology");

  const copyToClipboard = async () => {
    const text = `${data.word}${data.primaryDefinition ? ` — ${data.primaryDefinition}` : ""}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="vt-word-card">
      <section className="vt-word-overview">
        <div className="vt-word-labels">
          <span className="vt-word-source">{isLibrary ? "In your library" : "Word study"}</span>
          {data.partOfSpeech && <span className="vt-word-pos">{data.partOfSpeech}</span>}
        </div>
        <h2 className="vt-word-title vt-word-serif">{data.word}</h2>
        {(data.pronunciationReadable || data.pronunciation) && (
          <div className="vt-pronunciation">
            {data.pronunciationReadable && <span>/{data.pronunciationReadable}/</span>}
            {data.pronunciation && <small>{data.pronunciation}</small>}
            <SpeakButton word={data.word} />
          </div>
        )}
        <div className="vt-word-actions">
          {source === "ai" && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className={saved ? "vt-button-secondary is-saved" : "vt-button-primary"}
            >
              {saved ? "Saved to library" : saving ? "Saving…" : "Save word"}
            </button>
          )}
          <button type="button" onClick={copyToClipboard} className="vt-button-secondary">
            {copied ? "Copied" : "Copy definition"}
          </button>
        </div>
      </section>

      <section className="vt-word-detail">
        <div className="vt-word-tabs" role="tablist" aria-label="Word details">
          {tabs.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? "is-active" : ""}
              onClick={() => setTab(name)}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>

        <div className="vt-word-tab-panel" role="tabpanel">
          {tab === "definition" && <p className="vt-word-definition">{data.primaryDefinition}</p>}
          {tab === "examples" && (
            <div className="vt-word-examples">
              {(data.examples || []).length === 0 && (
                <p className="vt-word-empty">No examples are available for this word.</p>
              )}
              {(data.examples || []).map((example, index) => (
                <blockquote key={index}>
                  <p>“{highlight(example, data.word)}”</p>
                </blockquote>
              ))}
            </div>
          )}
          {tab === "etymology" && <p className="vt-word-etymology">{data.etymology}</p>}
        </div>
      </section>
    </article>
  );
}
