import { useState } from "react";
import { Link } from "react-router-dom";
import { generateQuiz, saveQuizAttempt } from "../api/quiz";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PRESETS = [5, 10, 15, 20];
const LETTERS = ["A", "B", "C", "D"];

// Motivational quotes grouped by how well the user did.
const QUOTES = {
  high: [
    "The limits of my language mean the limits of my world. — Ludwig Wittgenstein",
    "A different language is a different vision of life. — Federico Fellini",
    "Words are, of course, the most powerful drug used by mankind. — Rudyard Kipling",
  ],
  mid: [
    "The more that you read, the more things you will know. — Dr. Seuss",
    "Learning never exhausts the mind. — Leonardo da Vinci",
    "Slow progress is still progress. Keep going.",
  ],
  low: [
    "Every expert was once a beginner. — Helen Hayes",
    "Mistakes are proof that you are trying.",
    "Fall seven times, stand up eight. — Japanese proverb",
  ],
};

const pickQuote = (score, total) => {
  const pct = total ? (score / total) * 100 : 0;
  const band = pct >= 80 ? "high" : pct >= 50 ? "mid" : "low";
  const list = QUOTES[band];
  return list[Math.floor(Math.random() * list.length)];
};

export default function Quiz() {
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // selected option index per question, or null
  const [finished, setFinished] = useState(false);
  const [quote, setQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const start = async () => {
    setLoading(true); setError(""); setQuiz(null); setFinished(false);
    setSaved(false); setSaveError(""); setQuote("");
    try {
      const res = await generateQuiz(count);
      if (res.data.success && res.data.quiz?.length) {
        setQuiz(res.data.quiz);
        setAnswers(Array(res.data.quiz.length).fill(null));
        setCurrent(0);
      } else {
        setError(res.data.message || "Could not generate a quiz.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not generate a quiz.");
    }
    setLoading(false);
  };

  const choose = (optionIndex) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[current] = optionIndex;
      return copy;
    });
  };

  const clearAnswer = () => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[current] = null;
      return copy;
    });
  };

  const goTo = (i) => setCurrent(i);
  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(quiz.length - 1, c + 1));

  const finish = () => {
    setQuote(pickQuote(score, quiz.length));
    setFinished(true);
  };

  const newQuiz = () => {
    setQuiz(null); setError(""); setFinished(false);
    setSaved(false); setSaveError(""); setQuote("");
  };

  const saveAttempt = async () => {
    setSaving(true); setSaveError("");
    try {
      const percentage = Math.round((score / quiz.length) * 100);
      const questions = quiz.map((q, i) => ({
        word: q.word,
        partOfSpeech: q.partOfSpeech,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        correctAnswer: q.correctAnswer,
        chosenIndex: answers[i],
        chosenAnswer: answers[i] === null ? null : q.options[answers[i]],
        isCorrect: answers[i] === q.correctIndex,
      }));
      const res = await saveQuizAttempt({
        score,
        total: quiz.length,
        percentage,
        quote,
        questions,
      });
      if (res.data.success) setSaved(true);
      else setSaveError(res.data.message || "Could not save attempt.");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Could not save attempt.");
    }
    setSaving(false);
  };

  const score = quiz ? answers.filter((a, i) => a === quiz[i].correctIndex).length : 0;

  // ── Setup screen ──────────────────────────────────────────────
  if (!quiz) {
    return (
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pb-16 pt-12">
        <div className="mx-auto max-w-[560px] text-center">
          <h1 className={`${SERIF} m-0 mb-3.5 text-[clamp(40px,6vw,68px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#ededf2]`}>
            Test your vocabulary
          </h1>
          <p className="m-0 mb-10 text-base text-[#9a9aae]">
            We'll pull words from your library and dress each one up with three convincing wrong meanings.
          </p>

          <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 text-left shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
            <div className="mb-3 text-[11.5px] uppercase tracking-[0.12em] text-[#6a6a7c]">How many words?</div>

            <div className="mb-5 flex flex-wrap gap-2.5">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`cursor-pointer rounded-[22px] border-[0.5px] px-5 py-2 text-sm font-semibold transition-all ${
                    count === n
                      ? "border-[#7c6cff] bg-[rgba(124,108,255,0.12)] text-[#b6abff]"
                      : "border-white/[0.07] bg-white/[0.02] text-[#9a9aae] hover:border-[rgba(124,108,255,0.5)] hover:text-[#b6abff]"
                  }`}
                >
                  {n} words
                </button>
              ))}
            </div>

            <div className="mb-7 flex items-center gap-3">
              <span className="text-[13px] text-[#6a6a7c]">Or pick a number (max 20):</span>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
                  setCount(v);
                }}
                className="w-20 rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3 py-2 text-center text-sm text-[#ededf2] outline-none transition-all focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]"
              />
            </div>

            <button
              onClick={start}
              disabled={loading}
              className={`inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-br from-[#cfc8ff] to-[#a99eff] px-9 py-3.5 text-base font-semibold text-[#2b1a6b] shadow-[0_0_0_6px_rgba(124,108,255,0.10),0_14px_36px_-10px_rgba(124,108,255,0.75)] transition-transform hover:-translate-y-px ${
                loading ? "opacity-70" : ""
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span> Building your quiz…
                </>
              ) : (
                <>Start quiz</>
              )}
            </button>
          </div>

          {error && (
            <div className="mx-auto mt-6 rounded-xl border-[0.5px] border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] px-[18px] py-[13px] text-sm text-[#ff7b7b]">
              {error}{" "}
              <Link to="/library" className="font-semibold text-[#ff9b9b] underline">
                Explore your saved words →
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Results screen ────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((score / quiz.length) * 100);
    const verdict =
      pct >= 80 ? "Outstanding." : pct >= 50 ? "Solid effort." : "Worth another round.";

    return (
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pb-16 pt-12">
        <div className="mx-auto max-w-[720px]">
          <div className="rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-10 text-center shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] animate-[cardIn_0.4s_ease]">
            <div className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-[#6a6a7c]">Your score</div>
            <div className={`${SERIF} bg-gradient-to-br from-[#c9c0ff] via-[#7c6cff] to-[#5b4fd6] bg-clip-text text-[64px] font-extrabold leading-none tracking-[-0.02em] text-transparent`}>
              {score}/{quiz.length}
            </div>
            <p className="mb-1 mt-3 text-lg font-semibold text-[#ededf2]">{verdict}</p>
            <p className="m-0 text-sm text-[#9a9aae]">{pct}% correct</p>

            {quote && (
              <p className={`${SERIF} mx-auto mt-6 max-w-[460px] text-[15px] italic leading-[1.6] text-[#b6abff]`}>
                "{quote}"
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                onClick={start}
                className="cursor-pointer rounded-[12px] bg-[#7c6cff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px"
              >
                Try again
              </button>
              <button
                onClick={newQuiz}
                className="cursor-pointer rounded-[12px] border-[0.5px] border-white/[0.07] bg-transparent px-6 py-3 text-sm font-medium text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]"
              >
                New quiz
              </button>
            </div>

            {/* Save attempt for future reference */}
            <div className="mt-6 border-t border-white/[0.06] pt-6">
              <button
                onClick={saveAttempt}
                disabled={saving || saved}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-[12px] px-6 py-3 text-sm font-semibold transition-all ${
                  saved
                    ? "cursor-default border-[0.5px] border-[rgba(94,224,138,0.3)] bg-[rgba(46,184,114,0.14)] text-[#5ee08a]"
                    : "border-[0.5px] border-[rgba(124,108,255,0.45)] bg-[rgba(124,108,255,0.12)] text-[#b6abff] hover:-translate-y-px"
                } ${saving ? "opacity-70" : ""}`}
              >
                {saved ? "✓ Attempt saved" : saving ? "Saving…" : "🔖 Save this attempt"}
              </button>
              {saved && (
                <p className="m-0 mt-2.5 text-[12.5px] text-[#6a6a7c]">
                  Stored to your history for future reference.
                </p>
              )}
              {saveError && (
                <p className="m-0 mt-2.5 text-[12.5px] text-[#ff7b7b]">{saveError}</p>
              )}
            </div>
          </div>

          {/* Review */}
          <div className="mt-8 flex flex-col gap-3">
            {quiz.map((q, i) => {
              const ok = answers[i] === q.correctIndex;
              return (
                <div key={q.wordId || i} className="rounded-[14px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-5">
                  <div className="mb-2 flex items-center gap-3">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      ok ? "bg-[rgba(46,184,114,0.14)] text-[#5ee08a]" : "bg-[rgba(255,123,123,0.12)] text-[#ff7b7b]"
                    }`}>
                      {ok ? "✓" : "✕"}
                    </span>
                    <span className={`${SERIF} text-xl font-bold text-[#ededf2]`}>{q.word}</span>
                  </div>
                  <p className="m-0 text-[13.5px] leading-[1.6] text-[#5ee08a]">
                    <span className="text-[#6a6a7c]">Correct: </span>{q.correctAnswer}
                  </p>
                  {!ok && (
                    <p className="m-0 mt-1 text-[13.5px] leading-[1.6] text-[#ff7b7b]">
                      <span className="text-[#6a6a7c]">You chose: </span>
                      {answers[i] === null ? "— (skipped)" : q.options[answers[i]]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Active question ───────────────────────────────────────────
  const q = quiz[current];
  const selected = answers[current];
  const answeredCount = answers.filter((a) => a !== null).length;
  const remaining = quiz.length - answeredCount;
  const progress = (answeredCount / quiz.length) * 100;

  return (
    <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pb-16 pt-12">
      <div className="mx-auto grid max-w-[1000px] gap-6 lg:grid-cols-[1fr_240px]">
        {/* Left: progress + question */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#9a9aae]">
              Question {current + 1} of {quiz.length}
            </span>
            <span className="text-[13px] text-[#6a6a7c]">{answeredCount}/{quiz.length} answered</span>
          </div>
          <div className="mb-7 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7c6cff] to-[#a99eff] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] animate-[cardIn_0.3s_ease]" key={current}>
            <div className="mb-1.5 text-[11.5px] uppercase tracking-[0.12em] text-[#6a6a7c]">
              What does this word mean?
            </div>
            <h2 className={`${SERIF} m-0 mb-1 break-words bg-gradient-to-br from-[#c9c0ff] via-[#7c6cff] to-[#5b4fd6] bg-clip-text text-[44px] font-extrabold leading-[1.05] tracking-[-0.015em] text-transparent`}>
              {q.word}
            </h2>
            {q.partOfSpeech && (
              <span className="text-[13px] italic text-[#9a9aae]">{q.partOfSpeech}</span>
            )}

            <div className="mt-7 flex flex-col gap-3">
              {q.options.map((opt, oi) => {
                const isSel = oi === selected;
                return (
                  <button
                    key={oi}
                    onClick={() => choose(oi)}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-[12px] border-[0.5px] px-4 py-3.5 text-left text-[15px] leading-[1.5] transition-all ${
                      isSel
                        ? "border-[rgba(124,108,255,0.6)] bg-[rgba(124,108,255,0.12)] text-[#ededf2]"
                        : "border-white/[0.07] bg-[#15151f] text-[#cfcfda] hover:border-[rgba(124,108,255,0.5)] hover:text-[#ededf2]"
                    }`}
                  >
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${
                      isSel ? "border-[#7c6cff] bg-[#7c6cff] text-white" : "border-white/[0.1] text-[#6a6a7c]"
                    }`}>
                      {LETTERS[oi]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                onClick={prev}
                disabled={current === 0}
                className={`rounded-[10px] border-[0.5px] border-white/[0.07] bg-transparent px-4 py-2.5 text-sm font-medium transition-all ${
                  current === 0
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer text-[#9a9aae] hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]"
                }`}
              >
                ← Previous
              </button>

              {selected !== null && (
                <button
                  onClick={clearAnswer}
                  className="cursor-pointer bg-transparent text-[12.5px] text-[#6a6a7c] underline transition-colors hover:text-[#ff7b7b]"
                >
                  Clear answer
                </button>
              )}

              <button
                onClick={next}
                disabled={current === quiz.length - 1}
                className={`rounded-[10px] border-[0.5px] px-4 py-2.5 text-sm font-medium transition-all ${
                  current === quiz.length - 1
                    ? "cursor-not-allowed border-white/[0.07] opacity-40"
                    : "cursor-pointer border-[rgba(124,108,255,0.45)] bg-[rgba(124,108,255,0.12)] text-[#b6abff] hover:-translate-y-px"
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Right: question navigator */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="rounded-[18px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-5">
            <div className="mb-1 text-[11.5px] uppercase tracking-[0.12em] text-[#6a6a7c]">Questions</div>
            <div className="mb-4 text-[12.5px] text-[#9a9aae]">
              {answeredCount} answered · {remaining} left
            </div>

            <div className="grid grid-cols-5 gap-2">
              {quiz.map((_, i) => {
                const isCurrent = i === current;
                const isAnswered = answers[i] !== null;
                let cls;
                if (isCurrent) cls = "border-[#7c6cff] bg-[#7c6cff] text-white";
                else if (isAnswered)
                  cls = "border-[rgba(124,108,255,0.4)] bg-[rgba(124,108,255,0.12)] text-[#b6abff]";
                else
                  cls = "border-white/[0.08] bg-white/[0.02] text-[#6a6a7c] hover:border-[rgba(124,108,255,0.4)] hover:text-[#b6abff]";
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`flex h-9 w-full cursor-pointer items-center justify-center rounded-[9px] border-[0.5px] text-[13px] font-semibold transition-all ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-col gap-1.5 text-[11.5px] text-[#6a6a7c]">
              <span className="flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px] bg-[#7c6cff]" /> Current
              </span>
              <span className="flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px] bg-[rgba(124,108,255,0.35)]" /> Answered
              </span>
              <span className="flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px] border-[0.5px] border-white/[0.15] bg-white/[0.02]" /> Unanswered
              </span>
            </div>

            <button
              onClick={finish}
              className="mt-5 w-full cursor-pointer rounded-[12px] bg-gradient-to-br from-[#cfc8ff] to-[#a99eff] px-5 py-3 text-sm font-semibold text-[#2b1a6b] shadow-[0_10px_28px_-10px_rgba(124,108,255,0.75)] transition-transform hover:-translate-y-px"
            >
              See results →
            </button>
            {remaining > 0 && (
              <p className="m-0 mt-2 text-center text-[11.5px] text-[#6a6a7c]">
                {remaining} still unanswered
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}