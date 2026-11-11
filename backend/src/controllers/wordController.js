import OpenAI from "openai";
import Word from "../models/Word.js";
import mongoose from "mongoose";
import logger from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

export const searchWord = asyncHandler(async (req, res) => {
  let { word, forceExact } = req.body;

  word = word.trim().toLowerCase();
  const userId = req.user.userId;

  // ── 1) Library check on the exact typed term (instant, free) ──
  const savedExact = await Word.findOne({ userId, word });
  if (savedExact) {
    return res.status(200).json({
      success: true,
      source: "library",
      data: savedExact,
      correctedFrom: null,
    });
  }

  const prompt = `
    You are a professional English dictionary assistant.

    For the term "${word}", return ONLY valid JSON.

    The term may be:
    - a normal word
    - an idiom
    - a phrase
    - an expression
    - a proverb
    - a phrasal verb

    Return raw JSON only.
    Do NOT include markdown.
    Do NOT include explanations.

    Spelling correction:
    - If "${word}" is misspelled, set "corrected" to the properly spelled term
      and define THAT corrected term (not the misspelled input).
    - If "${word}" is already spelled correctly, set "corrected" equal to "${word}".
    - "word" must always be the corrected/canonical spelling you defined.

    Rules:

    "type" must be exactly one of:

    word
    idiom
    phrase
    expression
    phrasal verb
    proverb

    Examples:

    "embrace" → word
    "make amends" → phrase
    "hang up your boots" → idiom
    "come hell or high water" → idiom
    "keep abreast of" → phrasal verb
    "by golly" → expression
    "a stitch in time saves nine" → proverb

    "partOfSpeech" must be one of:

    noun
    verb
    adjective
    adverb
    pronoun
    preposition
    conjunction
    determiner
    article
    proper noun
    abbreviation

    If the term is an idiom, phrase, expression, proverb, or phrasal verb,
    still provide the closest grammatical category.

    Return exactly this structure:

    {
      "word": "${word}",
      "corrected": "${word}",
      "type": "word",
      "partOfSpeech": "noun",
      "primaryDefinition": "definition",
      "pronunciation": "IPA pronunciation",
      "pronunciationReadable": "simple readable pronunciation",
      "examples": [
        "Example sentence 1.",
        "Example sentence 2."
      ]
    }
    `;

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional English dictionary assistant. Always respond with raw valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  const rawContent = response.choices[0].message.content.trim();

  let data;
  try {
    data = JSON.parse(rawContent);

    const allowedTypes = [
      "word",
      "idiom",
      "phrase",
      "expression",
      "phrasal verb",
      "proverb",
    ];

    if (!allowedTypes.includes(data.type)) {
      data.type = "word";
    }
  } catch (err) {
    logger.error("Failed to parse OpenAI response:", rawContent);
    throw new ApiError("Failed to parse AI response", 500);
  }

  // ── Resolve the corrected spelling ──
  const corrected = forceExact
    ? word
    : String(data.corrected || data.word || word).trim().toLowerCase();

  data.word = corrected;
  const wasCorrected = corrected !== word;

  // ── Re-check the library for the CORRECTED term ──
  if (wasCorrected) {
    const savedCorrected = await Word.findOne({ userId, word: corrected });
    if (savedCorrected) {
      return res.status(200).json({
        success: true,
        source: "library",
        data: savedCorrected,
        correctedFrom: word,
      });
    }
  }

  // ── Not in library → return the AI result ──
  return res.status(200).json({
    success: true,
    source: "ai",
    data,
    correctedFrom: wasCorrected ? word : null,
  });
});

export const saveWord = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Accept both shapes:
  // 1. Flat:   { word, primaryDefinition, ... }
  // 2. Nested: { source, data: { word, primaryDefinition, ... } }
  const payload = req.body.data ?? req.body;

  const {
    word,
    type,
    partOfSpeech,
    primaryDefinition,
    pronunciation,
    pronunciationReadable,
    examples,
  } = payload;

  if (!word || !primaryDefinition) {
    throw new ApiError("word and primaryDefinition are required", 400);
  }

  const normalizedWord = word.trim().toLowerCase();

  const saved = await Word.create({
    userId,
    word: normalizedWord,
    type: type || "word",
    partOfSpeech: partOfSpeech || "",
    primaryDefinition,
    pronunciation: pronunciation || "",
    pronunciationReadable: pronunciationReadable || "",
    examples: examples || [],
  });

  return res.status(201).json({
    success: true,
    message: "Word saved to your library",
    data: saved,
  });
});

export const getLibrary = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const words = await Word.find({ userId }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: words.length,
    data: words,
  });
});

export const deleteWord = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const deleted = await Word.findOneAndDelete({ _id: id, userId });

  if (!deleted) {
    throw new ApiError("Word not found in your library", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Word removed from your library",
  });
});

export const getSpecificWord = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const word = String(req.params.word || "").trim().toLowerCase();

  if (!word) {
    throw new ApiError("Word is required", 400);
  }

  const found = await Word.findOne({ userId, word });

  if (!found) {
    throw new ApiError("Word not found in your library", 404);
  }

  return res.status(200).json({ success: true, data: found });
});

export const updateWord = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid word id", 400);
  }

  const payload = req.body.data ?? req.body;

  const {
    word,
    type,
    partOfSpeech,
    primaryDefinition,
    pronunciation,
    pronunciationReadable,
    examples,
  } = payload;

  const updates = {};

  const allowedTypes = [
    "word",
    "idiom",
    "phrase",
    "expression",
    "phrasal verb",
    "proverb",
  ];

  if (word !== undefined) {
    updates.word = String(word).trim().toLowerCase();
  }

  if (type !== undefined) {
    updates.type = allowedTypes.includes(type) ? type : "word";
  }

  if (partOfSpeech !== undefined) {
    updates.partOfSpeech = partOfSpeech;
  }

  if (primaryDefinition !== undefined) {
    updates.primaryDefinition = primaryDefinition;
  }

  if (pronunciation !== undefined) {
    updates.pronunciation = pronunciation;
  }

  if (pronunciationReadable !== undefined) {
    updates.pronunciationReadable = pronunciationReadable;
  }

  if (examples !== undefined) {
    updates.examples = Array.isArray(examples) ? examples : [];
  }

  if (
    updates.word === "" ||
    updates.primaryDefinition === ""
  ) {
    throw new ApiError("word and primaryDefinition cannot be empty", 400);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError("Nothing to update", 400);
  }

  const updated = await Word.findOneAndUpdate(
    { _id: id, userId },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updated) {
    throw new ApiError("Word not found in your library", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Word updated",
    data: updated,
  });
});

export const bulkSaveWords = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const words = req.body;

  if (!Array.isArray(words)) {
    throw new ApiError("Expected an array of words", 400);
  }

  const docs = words.map((word) => ({
    userId,
    word: word.word.trim().toLowerCase(),
    type: word.type || "word",
    partOfSpeech: word.partOfSpeech || "",
    primaryDefinition: word.primaryDefinition,
    pronunciation: word.pronunciation || "",
    pronunciationReadable: word.pronunciationReadable || "",
    examples: word.examples || [],
  }));

  try {
    const result = await Word.insertMany(docs, { ordered: false });

    return res.status(201).json({
      success: true,
      importedCount: result.length,
      duplicateWords: [],
      message: `${result.length} words imported successfully`,
    });
  } catch (error) {
    if (error.name === "MongoBulkWriteError") {
      const duplicates = error.writeErrors.map((err) => err.err.op.word);

      const importedCount = docs.length - duplicates.length;

      return res.status(200).json({
        success: true,
        importedCount,
        duplicateWords: duplicates,
        message: `${importedCount} words imported successfully`,
      });
    }

    throw error;
  }
});
