import mongoose from "mongoose";

// One answered question within an attempt — keeps both the correct
// answer and what the user actually chose, for full review later.
const attemptQuestionSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    partOfSpeech: { type: String, default: "" },
    question: { type: String, default: "" },
    options: { type: [String], default: [] },

    correctIndex: { type: Number, required: true },
    correctAnswer: { type: String, default: "" },

    chosenIndex: { type: Number, default: null }, // null = skipped
    chosenAnswer: { type: String, default: null },

    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },

    quote: { type: String, default: "" },

    questions: { type: [attemptQuestionSchema], default: [] },
  },
  { timestamps: true }
);

// Fast lookup of a user's history, newest first.
quizAttemptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("QuizAttempt", quizAttemptSchema);