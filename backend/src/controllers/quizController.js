import mongoose from "mongoose";
import Word from "../models/Word.js";
import QuizAttempt from "../models/QuizAttempt.js";
import getOpenAIClient from "../utils/openaiClient.js";
import logger from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const MAX_QUIZ_SIZE = 20;

// Fisher–Yates shuffle (returns a new array, does not mutate input)
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const norm = (s) => String(s || "").trim().toLowerCase();

// Strip accidental ```json fences before JSON.parse
const stripFences = (text) =>
  String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

// Ask OpenAI for 3 wrong-but-plausible definitions per word.
const fetchDistractors = async (words) => {
  const list = words
    .map(
      (w, i) =>
        `${i + 1}. word: "${w.word}" (${w.partOfSpeech || "n/a"}) — correct meaning: "${w.primaryDefinition}"`
    )
    .join("\n");

  const prompt = `You are creating multiple-choice vocabulary quiz questions.

For each word below, write exactly 3 INCORRECT but believable dictionary-style definitions ("distractors").

Strict rules:
- Each distractor must be plausible and similar in length, tone, and part of speech to the correct meaning.
- Distractors must describe a DIFFERENT concept — never a synonym, rephrasing, or partial match of the correct meaning.
- Do not mention the word itself inside its distractors.
- Return ONLY raw JSON in this exact shape (no markdown, no commentary):

{
  "results": [
    { "word": "<the word>", "wrongDefinitions": ["...", "...", "..."] }
  ]
}

Words:
${list}`;

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You generate vocabulary quiz distractors and always reply with raw valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = JSON.parse(stripFences(response.choices[0].message.content));

    const map = {};
    for (const item of parsed.results || []) {
      if (item?.word && Array.isArray(item.wrongDefinitions)) {
        map[norm(item.word)] = item.wrongDefinitions;
      }
    }
    return map;
  } catch (error) {
    logger.error("Distractor generation failed, using fallback:", error.message);
    return {};
  }
};

export const generateQuiz = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  let count = parseInt(req.body.count, 10);

  if (!count || count < 1) {
    throw new ApiError(
      "Please provide a valid 'count' (number of words for the quiz).",
      400
    );
  }

  if (count > MAX_QUIZ_SIZE) count = MAX_QUIZ_SIZE;

  const totalInLibrary = await Word.countDocuments({ userId });

  if (totalInLibrary === 0) {
    throw new ApiError(
      "Your library is empty. Save some words before generating a quiz.",
      404
    );
  }

  const size = Math.min(count, totalInLibrary);

  const words = await Word.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sample: { size } },
  ]);

  const distractorMap = await fetchDistractors(words);

  const allDefinitions = words.map((w) => w.primaryDefinition);

  const quiz = words.map((w, idx) => {
    const correct = w.primaryDefinition;

    let wrongs = (distractorMap[norm(w.word)] || [])
      .filter((d) => typeof d === "string" && d.trim())
      .map((d) => d.trim())
      .filter((d) => norm(d) !== norm(correct));
    wrongs = [...new Set(wrongs)];

    if (wrongs.length < 3) {
      const pool = shuffle(
        allDefinitions.filter(
          (d) => norm(d) !== norm(correct) && !wrongs.some((x) => norm(x) === norm(d))
        )
      );
      for (const d of pool) {
        if (wrongs.length >= 3) break;
        wrongs.push(d);
      }
    }

    while (wrongs.length < 3) wrongs.push("A meaning unrelated to this word.");

    wrongs = wrongs.slice(0, 3);

    const options = shuffle([correct, ...wrongs]);

    return {
      questionNumber: idx + 1,
      wordId: w._id,
      word: w.word,
      partOfSpeech: w.partOfSpeech,
      pronunciation: w.pronunciation,
      pronunciationReadable: w.pronunciationReadable,
      question: `What does "${w.word}" mean?`,
      options,
      correctAnswer: correct,
      correctIndex: options.indexOf(correct),
    };
  });

  return res.status(200).json({
    success: true,
    requested: count,
    count: quiz.length,
    totalInLibrary,
    quiz,
  });
});

export const saveQuizAttempt = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { quote, questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ApiError(
      "A non-empty 'questions' array is required to save an attempt.",
      400
    );
  }

  const normalized = questions.map((q) => {
    const correctIndex = Number(q.correctIndex);
    const chosenIndex =
      q.chosenIndex === null || q.chosenIndex === undefined ? null : Number(q.chosenIndex);
    const options = Array.isArray(q.options) ? q.options : [];

    return {
      word: q.word,
      partOfSpeech: q.partOfSpeech || "",
      question: q.question || "",
      options,
      correctIndex,
      correctAnswer: q.correctAnswer || options[correctIndex] || "",
      chosenIndex,
      chosenAnswer:
        chosenIndex === null ? null : q.chosenAnswer ?? options[chosenIndex] ?? null,
      isCorrect: chosenIndex !== null && chosenIndex === correctIndex,
    };
  });

  const total = normalized.length;
  const score = normalized.filter((q) => q.isCorrect).length;
  const percentage = Math.round((score / total) * 100);

  const attempt = await QuizAttempt.create({
    userId,
    score,
    total,
    percentage,
    quote: quote || "",
    questions: normalized,
  });

  return res.status(201).json({
    success: true,
    message: "Quiz attempt saved.",
    data: attempt,
  });
});

export const getQuizAttempts = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const attempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: attempts.length,
    data: attempts,
  });
});
