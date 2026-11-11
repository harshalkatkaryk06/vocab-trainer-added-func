import mongoose from "mongoose";

const wordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    type: {
      type: String,
      enum: [
        "word",
        "idiom",
        "phrase",
        "expression",
        "phrasal verb",
        "proverb",
      ],
      default: "word",
    },

    partOfSpeech: {
      type: String,
      default: "",
    },

    primaryDefinition: {
      type: String,
      required: true,
    },

    pronunciation: {
      type: String,
      default: "",
    },

    pronunciationReadable: {
      type: String,
      default: "",
    },

    examples: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

wordSchema.index(
  { userId: 1, word: 1 },
  { unique: true }
);

export default mongoose.model(
  "Word",
  wordSchema
);