import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import dailyAiLimiter from "../middlewares/dailyAiLimiter.js";
import { validate, schemas } from "../validation/schemas.js";
import {
  searchWord,
  saveWord,
  getLibrary,
  deleteWord,
  getSpecificWord,
  updateWord,
  bulkSaveWords,
} from "../controllers/wordController.js";

const router = express.Router();

// All word routes are protected
router.post(
  "/search",
  authMiddleware,
  dailyAiLimiter,
  validate(schemas.searchWord),
  searchWord
);
router.post(
  "/save",
  authMiddleware,
  validate(schemas.saveWord),
  saveWord
);
router.get("/library", authMiddleware, getLibrary);
router.delete(
  "/:id",
  authMiddleware,
  validate(schemas.deleteWord),
  deleteWord
);
// Admin-gated word management
router.get(
  "/lookup/:word",
  authMiddleware,
  adminMiddleware,
  getSpecificWord
);
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(schemas.updateWord),
  updateWord
);
router.post(
  "/bulk-import",
  authMiddleware,
  adminMiddleware,
  bulkSaveWords
);
export default router;
