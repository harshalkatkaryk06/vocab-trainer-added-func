import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/authMiddleware.js";
import dailyAiLimiter from "../middlewares/dailyAiLimiter.js";
import { validate, schemas } from "../validation/schemas.js";
import { generateQuiz, saveQuizAttempt, getQuizAttempts } from "../controllers/quizController.js";

const router = express.Router();

// Quiz generation hits OpenAI, so give it its own tighter limiter.
const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many quiz requests. Please try again later.",
  },
});

router.post(
  "/generate",
  authMiddleware,
  dailyAiLimiter,
  quizLimiter,
  validate(schemas.generateQuiz),
  generateQuiz
);
router.post("/attempts", authMiddleware, saveQuizAttempt);
router.get("/attempts", authMiddleware, getQuizAttempts);

export default router;
