import api from "./axios";

// POST /api/v1/quiz/generate  body: { count }
export const generateQuiz = (count) => api.post("/quiz/generate", { count });

// POST /api/v1/quiz/attempts  body: { quote, questions }
export const saveQuizAttempt = (attempt) => api.post("/quiz/attempts", attempt);

// GET /api/v1/quiz/attempts -> user's saved attempts
export const getQuizAttempts = () => api.get("/quiz/attempts");
