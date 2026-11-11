import { useState } from "react";
import { saveWord, updateWord, deleteWord, getSpecificWord } from "../api/words";
import DeleteConfirmModal from "../components/ConfirmDeleteModal";
const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const INPUT =
  "w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]";
const LABEL = "mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]";
const BTN_PRIMARY =
  "rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px disabled:opacity-60";
const BTN_GHOST =
  "rounded-[12px] border-[0.5px] border-white/[0.07] bg-transparent px-5 py-3 text-sm font-medium text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]";

const EMPTY = { word: "", partOfSpeech: "", primaryDefinition: "", pronunciation: "", pronunciationReadable: "", examples: "" };

// phases: idle → menu → (create | editFind | editForm | delete) → back to menu (loop) … until Stop → idle

function WordFields({ form, set }) {
  return (
    <>
      <label className={LABEL}>Word *</label>
      <input
        className={INPUT}
        value={form.word}
        onChange={set("word")}
        placeholder="e.g. serendipity"
      />

      <label className={`${LABEL} mt-4`}>
        Part of speech
      </label>

      <input
        className={INPUT}
        value={form.partOfSpeech}
        onChange={set("partOfSpeech")}
        placeholder="noun, verb, adjective…"
      />

      <label className={`${LABEL} mt-4`}>
        Definition *
      </label>

      <input
        className={INPUT}
        value={form.primaryDefinition}
        onChange={set("primaryDefinition")}
        placeholder="A clear, concise definition"
      />

      <label className={`${LABEL} mt-4`}>
        Pronunciation (IPA)
      </label>

      <input
        className={INPUT}
        value={form.pronunciation}
        onChange={set("pronunciation")}
        placeholder="ˌsɛrənˈdɪpɪti"
      />

      <label className={`${LABEL} mt-4`}>
        Pronunciation (readable)
      </label>

      <input
        className={INPUT}
        value={form.pronunciationReadable}
        onChange={set("pronunciationReadable")}
        placeholder="ser-uhn-DIP-i-tee"
      />

      <label className={`${LABEL} mt-4`}>
        Examples (one per line)
      </label>

      <textarea
        className={`${INPUT} min-h-[90px] resize-y`}
        value={form.examples}
        onChange={set("examples")}
        placeholder={"Example sentence one.\nExample sentence two."}
      />
    </>
  );
}
export default function AdminWords() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [phase, setPhase] = useState("idle");
const [jsonInput, setJsonInput] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [findWord, setFindWord] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok" | "err", text }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const resetForm = () => setForm(EMPTY);
  const flash = (type, text) => setMsg({ type, text });

  const toExamplesArray = (s) =>
    String(s || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  const fromExamplesArray = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");

  const backToMenu = () => { resetForm(); setFindWord(""); setEditId(null); setPhase("menu"); };

  // ── CREATE ──
  const doCreate = async () => {
    if (!form.word.trim() || !form.primaryDefinition.trim()) {
      flash("err", "Word and definition are required.");
      return;
    }
    setLoading(true); setMsg(null);
    try {
      const res = await saveWord({
        word: form.word.trim(),
        partOfSpeech: form.partOfSpeech.trim(),
        primaryDefinition: form.primaryDefinition.trim(),
        pronunciation: form.pronunciation.trim(),
        pronunciationReadable: form.pronunciationReadable.trim(),
        examples: toExamplesArray(form.examples),
      });
      if (res.data.success) {
  flash("ok", `“${form.word.trim()}” saved.`);

  // Clear form for next word
  resetForm();

  // Stay on create screen
  setPhase("create");
}
      else flash("err", res.data.message || "Could not save.");
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not save.");
    }
    setLoading(false);
  };


  // ── BULK JSON IMPORT ──
const doJsonImport = async () => {
  if (!jsonInput.trim()) {
    flash("err", "Paste JSON data.");
    return;
  }

  setLoading(true);
  setMsg(null);

  try {
    const words = JSON.parse(jsonInput);

    if (!Array.isArray(words)) {
      flash("err", "JSON must be an array.");
      setLoading(false);
      return;
    }

    let successCount = 0;
const duplicateWords = [];
const failedWords = [];

for (const word of words) {
  try {
    await saveWord({
      word: word.word || "",
      partOfSpeech: word.partOfSpeech || "",
      primaryDefinition: word.primaryDefinition || "",
      pronunciation: word.pronunciation || "",
      pronunciationReadable:
        word.pronunciationReadable || "",
      examples: word.examples || [],
    });

    successCount++;
  } catch (err) {
    const message =
      err?.response?.data?.message || "";

    if (
      message.includes("already exists")
    ) {
      duplicateWords.push(word.word);
    } else {
      failedWords.push(word.word);
    }
  }
}

    if (
  successCount === 0 &&
  duplicateWords.length === 0 &&
  failedWords.length > 0
) {
  flash(
    "err",
    "Server error occurred while importing words."
  );
}
else {
  let message = "";

  if (successCount > 0) {
    message += `${successCount} words imported successfully. `;
  }

  if (duplicateWords.length > 0) {
    message += `Already exists: ${duplicateWords.join(
      ", "
    )}. `;
  }

  if (failedWords.length > 0) {
    message += `Failed: ${failedWords.join(
      ", "
    )}.`;
  }

  flash(
    failedWords.length > 0 ? "err" : "ok",
    message
  );
}

    setJsonInput("");
  } catch {
    flash("err", "Invalid JSON format.");
  }

  setLoading(false);
};

  // ── EDIT: step 1 find ──
  const doFindForEdit = async () => {
    if (!findWord.trim()) { flash("err", "Enter a word to edit."); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await getSpecificWord(findWord.trim());
      if (res.data.success) {
        const w = res.data.data;
        setEditId(w._id);
        setForm({
          word: w.word || "",
          partOfSpeech: w.partOfSpeech || "",
          primaryDefinition: w.primaryDefinition || "",
          pronunciation: w.pronunciation || "",
          pronunciationReadable: w.pronunciationReadable || "",
          examples: fromExamplesArray(w.examples),
        });
        setPhase("editForm");
      } else flash("err", res.data.message || "Word not found.");
    } catch (err) {
      flash("err", err?.response?.data?.message || "Word not found in your library.");
    }
    setLoading(false);
  };

  // ── EDIT: step 2 save ──
  const doSaveEdit = async () => {
    if (!form.word.trim() || !form.primaryDefinition.trim()) {
      flash("err", "Word and definition are required.");
      return;
    }
    setLoading(true); setMsg(null);
    try {
      const res = await updateWord(editId, {
        word: form.word.trim(),
        partOfSpeech: form.partOfSpeech.trim(),
        primaryDefinition: form.primaryDefinition.trim(),
        pronunciation: form.pronunciation.trim(),
        pronunciationReadable: form.pronunciationReadable.trim(),
        examples: toExamplesArray(form.examples),
      });
      if (res.data.success) { flash("ok", `“${form.word.trim()}” updated.`); backToMenu(); }
      else flash("err", res.data.message || "Could not update.");
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not update.");
    }
    setLoading(false);
  };

  // ── DELETE ──
  const doDelete = async () => {
    if (!findWord.trim()) { flash("err", "Enter a word to delete."); return; }
    setLoading(true); setMsg(null);
    try {
      const found = await getSpecificWord(findWord.trim());
      if (!found.data.success) { flash("err", "Word not found."); setLoading(false); return; }
      const res = await deleteWord(found.data.data._id);
      if (res.data.success) { flash("ok", `“${findWord.trim()}” deleted.`); backToMenu(); }
      else flash("err", res.data.message || "Could not delete.");
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not delete.");
    }
    setLoading(false);
  };

  const Banner = () =>
    msg ? (
      <div
        className={`mb-5 rounded-[10px] border-[0.5px] px-3.5 py-2.5 text-[13px] ${
          msg.type === "ok"
            ? "border-[rgba(94,224,138,0.3)] bg-[rgba(94,224,138,0.1)] text-[#5ee08a]"
            : "border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] text-[#ff7b7b]"
        }`}
      >
        {msg.text}
      </div>
    ) : null;

  

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-16 pt-12">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-block rounded-full border-[0.5px] border-[rgba(124,108,255,0.3)] bg-[rgba(124,108,255,0.12)] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b6abff]">
          Admin · Manual entry
        </span>
        <h1 className={`${SERIF} m-0 text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.05] text-[#ededf2]`}>
          Add words without AI
        </h1>
        <p className="mt-2 text-[14px] text-[#9a9aae]">Create, edit, and delete words in your library — one operation at a time.</p>
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
        <Banner />

        {/* IDLE → Start */}
        {phase === "idle" && (
          <div className="py-8 text-center">
            <p className="mb-6 text-[15px] text-[#9a9aae]">Press Start to begin a session. You can keep performing operations until you press Stop.</p>
            <button className={BTN_PRIMARY} onClick={() => { setMsg(null); setPhase("menu"); }}>▶ Start</button>
          </div>
        )}

        {/* MENU → choose operation */}
        {phase === "menu" && (
          <div>
            <p className="mb-5 text-center text-[14px] text-[#9a9aae]">Choose an operation:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <button className={BTN_GHOST} onClick={() => { resetForm(); setMsg(null); setPhase("create"); }}>➕ Create</button>
              <button className={BTN_GHOST} onClick={() => { setFindWord(""); setMsg(null); setPhase("editFind"); }}>✏️ Edit</button>
              <button className={BTN_GHOST} onClick={() => { setFindWord(""); setMsg(null); setPhase("delete"); }}>🗑️ Delete</button>
              <button
                className={BTN_GHOST}
                onClick={() => {
                  setJsonInput("");
                  setMsg(null);
                  setPhase("jsonImport");
                }}
              >
                📦 JSON Import
              </button>
            </div>
            <div className="mt-7 text-center">
              <button className="text-[13px] text-[#6a6a7c] underline-offset-4 hover:text-[#ff7b7b] hover:underline" onClick={() => { setMsg(null); setPhase("idle"); }}>■ Stop session</button>
            </div>
          </div>
        )}

        {/* CREATE */}
        {phase === "create" && (
          <div>
            <h2 className={`${SERIF} mb-5 text-[22px] font-bold text-[#ededf2]`}>Create a word</h2>
            <WordFields
              form={form}
              set={set}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button className={BTN_PRIMARY} disabled={loading} onClick={doCreate}>{loading ? "Saving…" : "Save Word"}</button>
              <button className={BTN_GHOST} onClick={backToMenu}>← Back to menu</button>
            </div>
          </div>
        )}

        {/* EDIT — find */}
        {phase === "editFind" && (
          <div>
            <h2 className={`${SERIF} mb-5 text-[22px] font-bold text-[#ededf2]`}>Edit a word</h2>
            <label className={LABEL}>Enter the word to edit</label>
            <input className={INPUT} value={findWord} onChange={(e) => setFindWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doFindForEdit()} placeholder="word to edit" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button className={BTN_PRIMARY} disabled={loading} onClick={doFindForEdit}>{loading ? "Finding…" : "Continue →"}</button>
              <button className={BTN_GHOST} onClick={backToMenu}>← Back to menu</button>
            </div>
          </div>
        )}

        {/* EDIT — prefilled form */}
        {phase === "editForm" && (
          <div>
            <h2 className={`${SERIF} mb-5 text-[22px] font-bold text-[#ededf2]`}>Editing details</h2>
            <WordFields
              form={form}
              set={set}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button className={BTN_PRIMARY} disabled={loading} onClick={doSaveEdit}>{loading ? "Saving…" : "Save Edit"}</button>
              <button className={BTN_GHOST} onClick={backToMenu}>← Back to menu</button>
            </div>
          </div>
        )}


{/* JSON IMPORT */}
{phase === "jsonImport" && (
  <div>
    <h2
      className={`${SERIF} mb-5 text-[22px] font-bold text-[#ededf2]`}
    >
      Import Words from JSON
    </h2>

    <label className={LABEL}>
      Paste JSON Array
    </label>

    <textarea
      className={`${INPUT} min-h-[300px] font-mono`}
      value={jsonInput}
      onChange={(e) =>
        setJsonInput(e.target.value)
      }
      placeholder={`[
  {
    "word": "serendipity",
    "partOfSpeech": "noun",
    "primaryDefinition": "finding valuable things unexpectedly",
    "pronunciation": "ˌsɛrənˈdɪpɪti",
    "pronunciationReadable": "ser-uhn-DIP-i-tee",
    "examples": [
      "It was pure serendipity.",
      "They met by serendipity."
    ]
  }
]`}
    />

    <div className="mt-6 flex flex-wrap gap-3">
      <button
        className={BTN_PRIMARY}
        disabled={loading}
        onClick={doJsonImport}
      >
        {loading
          ? "Importing..."
          : "Import Words"}
      </button>

      <button
        className={BTN_GHOST}
        onClick={backToMenu}
      >
        ← Back to menu
      </button>
    </div>
  </div>
)}
        

        

        {/* DELETE */}
        {phase === "delete" && (
          <div>
            <h2 className={`${SERIF} mb-5 text-[22px] font-bold text-[#ededf2]`}>
              Delete a word
            </h2>

            <label className={LABEL}>
              Enter the word to delete
            </label>

            <input
              className={INPUT}
              value={findWord}
              onChange={(e) => setFindWord(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && setShowDeleteModal(true)
              }
              placeholder="word to delete"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-[12px] bg-[#ff7b7b] px-5 py-3 text-sm font-semibold text-[#2a0c0c] transition-transform hover:-translate-y-px disabled:opacity-60"
                disabled={loading || !findWord.trim()}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Word
              </button>

              <button
                className={BTN_GHOST}
                onClick={backToMenu}
              >
                ← Back to menu
              </button>
            </div>
          </div>
)}
      </div>
      <DeleteConfirmModal
  isOpen={showDeleteModal}
  word={findWord}
  loading={loading}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={async () => {
    setShowDeleteModal(false);
    await doDelete();
  }}
/>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');`}</style>
    </main>
  );
}