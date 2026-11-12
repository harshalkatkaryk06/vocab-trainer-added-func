import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { generateQuiz, saveQuizAttempt } from "../api/quiz";
import { subscriptionQueryKeys } from "../queries/subscriptions";

const PRESETS = [5, 10, 15, 20];
const LETTERS = ["A", "B", "C", "D"];

const QUOTES = {
  high: [
    "Strong recall comes from returning to a word. Keep the rhythm.",
    "Your practice is paying off. Keep making room for new words.",
  ],
  mid: [
    "You’re building familiarity. Another round will help it settle.",
    "A steady return to your words is how recall gets stronger.",
  ],
  low: [
    "Every review gives a word another chance to stick.",
    "Notice what you missed, then give those words another pass.",
  ],
};

const pickQuote = (score, total) => {
  const percentage = total ? (score / total) * 100 : 0;
  const group = percentage >= 80 ? "high" : percentage >= 50 ? "mid" : "low";
  const quotes = QUOTES[group];
  return quotes[Math.floor(Math.random() * quotes.length)];
};

export default function Quiz() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [quote, setQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const start = async () => {
    setLoading(true);
    setError("");
    setQuiz(null);
    setFinished(false);
    setSaved(false);
    setSaveError("");
    setQuote("");
    try {
      const response = await generateQuiz(count);
      if (response.data.success && response.data.quiz?.length) {
        setQuiz(response.data.quiz);
        setAnswers(Array(response.data.quiz.length).fill(null));
        setCurrent(0);
      } else {
        setError(response.data.message || "Could not generate a quiz.");
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not generate a quiz.");
    } finally {
      setLoading(false);
    }
  };

  const choose = (optionIndex) => {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      nextAnswers[current] = optionIndex;
      return nextAnswers;
    });
  };

  const clearAnswer = () => {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      nextAnswers[current] = null;
      return nextAnswers;
    });
  };

  const score = quiz
    ? answers.filter((answer, index) => answer === quiz[index].correctIndex).length
    : 0;

  const finish = () => {
    setQuote(pickQuote(score, quiz.length));
    setFinished(true);
  };

  const saveAttempt = async () => {
    if (!quiz || saving || saved) return;
    setSaving(true);
    setSaveError("");
    try {
      const percentage = Math.round((score / quiz.length) * 100);
      const questions = quiz.map((question, index) => ({
        word: question.word,
        partOfSpeech: question.partOfSpeech,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        correctAnswer: question.correctAnswer,
        chosenIndex: answers[index],
        chosenAnswer: answers[index] === null ? null : question.options[answers[index]],
        isCorrect: answers[index] === question.correctIndex,
      }));
      const response = await saveQuizAttempt({
        score,
        total: quiz.length,
        percentage,
        quote,
        questions,
      });
      if (response.data.success) {
        setSaved(true);
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKeys.quizAttempts(user?.id),
        });
      } else {
        setSaveError(response.data.message || "Could not save this attempt.");
      }
    } catch (requestError) {
      setSaveError(requestError?.response?.data?.message || "Could not save this attempt.");
    } finally {
      setSaving(false);
    }
  };

  const newQuiz = () => {
    setQuiz(null);
    setError("");
    setFinished(false);
    setSaved(false);
    setSaveError("");
    setQuote("");
  };

  if (!quiz) {
    return (
      <main className="vt-page-wrap vt-quiz-page">
        <header className="vt-page-heading">
          <p className="vt-eyebrow">Practice</p>
          <h1>Make your words your own.</h1>
          <p>Recall what you’ve saved with a short, focused quiz.</p>
        </header>

        <section className="vt-quiz-setup">
          <div className="vt-quiz-setup-copy">
            <span className="vt-quiz-setup-index">01 / SET UP</span>
            <h2>Choose a session length</h2>
            <p>Questions are built from words in your library.</p>
          </div>
          <div className="vt-quiz-count-options" role="group" aria-label="Number of quiz words">
            {PRESETS.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={count === value}
                className={count === value ? "is-active" : ""}
                onClick={() => setCount(value)}
              >
                {value}<span>words</span>
              </button>
            ))}
          </div>
          <label className="vt-quiz-custom-count">
            <span>Or choose a number from 1 to 20</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                setCount(Math.max(1, Math.min(20, Number.isNaN(value) ? 1 : value)));
              }}
            />
          </label>
          {error && (
            <div className="vt-quiz-error" role="alert">
              <span>{error}</span>
              <Link to="/library" className="vt-link">Visit your library</Link>
            </div>
          )}
          <button type="button" className="vt-button-primary vt-quiz-start" onClick={start} disabled={loading}>
            {loading ? "Preparing your quiz…" : "Start practice"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </section>
      </main>
    );
  }

  if (finished) {
    const percentage = Math.round((score / quiz.length) * 100);
    const verdict = percentage >= 80
      ? "Excellent recall."
      : percentage >= 50
        ? "Good work. Keep building."
        : "A useful first pass.";

    return (
      <main className="vt-page-wrap vt-quiz-page">
        <header className="vt-page-heading">
          <p className="vt-eyebrow">Session complete</p>
          <h1>Here’s how you did.</h1>
        </header>

        <section className="vt-quiz-results">
          <div className="vt-quiz-score">
            <span className="vt-eyebrow">Your score</span>
            <strong>{score}<span> / {quiz.length}</span></strong>
            <p>{verdict} {percentage}% correct</p>
            <div className="vt-quiz-score-track" aria-label={`${percentage}% correct`}>
              <span style={{ width: `${percentage}%` }} />
            </div>
            {quote && <p className="vt-quiz-feedback">{quote}</p>}
            <div className="vt-quiz-result-actions">
              <button type="button" className="vt-button-primary" onClick={start} disabled={loading}>
                {loading ? "Preparing…" : "Try again"}
              </button>
              <button type="button" className="vt-button-secondary" onClick={newQuiz}>New session</button>
            </div>
            <div className="vt-quiz-save">
              <button type="button" className="vt-button-secondary" onClick={saveAttempt} disabled={saving || saved}>
                {saved ? "Attempt saved" : saving ? "Saving…" : "Save to history"}
              </button>
              {saved && <p role="status">This session is now in your quiz history.</p>}
              {saveError && <p className="vt-form-error" role="alert">{saveError}</p>}
            </div>
          </div>

          <section className="vt-quiz-review" aria-label="Review answers">
            <div className="vt-quiz-review-heading">
              <h2>Review</h2>
              <span>{quiz.length} questions</span>
            </div>
            {quiz.map((question, index) => {
              const isCorrect = answers[index] === question.correctIndex;
              return (
                <article className="vt-quiz-review-item" key={question.wordId || index}>
                  <div className="vt-quiz-review-word">
                    <span className={isCorrect ? "is-correct" : "is-incorrect"} aria-label={isCorrect ? "Correct" : "Incorrect"}>
                      {isCorrect ? "✓" : "–"}
                    </span>
                    <h3>{question.word}</h3>
                  </div>
                  <p><strong>Meaning:</strong> {question.correctAnswer}</p>
                  {!isCorrect && (
                    <p className="vt-quiz-your-answer">
                      <strong>Your answer:</strong>{" "}
                      {answers[index] === null ? "Skipped" : question.options[answers[index]]}
                    </p>
                  )}
                </article>
              );
            })}
          </section>
        </section>
      </main>
    );
  }

  const question = quiz[current];
  const selected = answers[current];
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const progress = (answeredCount / quiz.length) * 100;

  return (
    <main className="vt-page-wrap vt-quiz-page">
      <header className="vt-quiz-progress">
        <div>
          <p className="vt-eyebrow">Practice session</p>
          <h1>Question {current + 1}<span> / {quiz.length}</span></h1>
        </div>
        <span>{answeredCount} answered</span>
        <div className="vt-quiz-progress-track" role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={quiz.length}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="vt-quiz-active-layout">
        <section className="vt-question-panel" key={current}>
          <p className="vt-eyebrow">{question.partOfSpeech || "Vocabulary"}</p>
          <h2 className="vt-word-serif">{question.word}</h2>
          <p className="vt-question-prompt">{question.question || "Choose the meaning of this word."}</p>
          <div className="vt-question-options" role="group" aria-label="Answer choices">
            {question.options.map((option, index) => (
              <button
                type="button"
                key={index}
                aria-pressed={selected === index}
                className={`vt-question-option${selected === index ? " is-selected" : ""}`}
                onClick={() => choose(index)}
              >
                <span>{LETTERS[index]}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <div className="vt-question-controls">
            <button type="button" className="vt-button-secondary" onClick={() => setCurrent((value) => Math.max(0, value - 1))} disabled={current === 0}>
              ← Previous
            </button>
            {selected !== null && (
              <button type="button" className="vt-question-clear" onClick={clearAnswer}>Clear answer</button>
            )}
            {current < quiz.length - 1 && (
              <button type="button" className="vt-button-primary" onClick={() => setCurrent((value) => Math.min(quiz.length - 1, value + 1))}>
                Next <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </section>

        <aside className="vt-question-nav">
          <div className="vt-question-nav-heading">
            <h2>Questions</h2>
            <span>{quiz.length - answeredCount} left</span>
          </div>
          <div className="vt-question-number-grid">
            {quiz.map((_, index) => (
              <button
                type="button"
                key={index}
                aria-label={`Go to question ${index + 1}${answers[index] === null ? ", unanswered" : ", answered"}`}
                aria-current={index === current ? "step" : undefined}
                className={`${index === current ? "is-current" : ""}${answers[index] !== null ? " is-answered" : ""}`}
                onClick={() => setCurrent(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="vt-question-nav-footer">
            <span>{answeredCount} of {quiz.length} answered</span>
            <button type="button" className="vt-button-primary" onClick={finish}>Finish session</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
