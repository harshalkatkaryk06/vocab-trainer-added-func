import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./config/logger.js";
import { validateEnv } from "./config/env.js";
import mongoSanitize from "./middlewares/mongoSanitize.js";
import authRoutes from "./routes/authRoutes.js";
import wordRoutes from "./routes/wordRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";

dotenv.config();
const app = express();

// Validate required environment variables before the app serves requests.
validateEnv();

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the built frontend (from backend/src → repo root → frontend build)
const clientDist = path.join(__dirname, "../../frontend/auth-client/dist");

/*
|--------------------------------------------------------------------------
| Trust Proxy — required behind Render's proxy for Secure cookies
|--------------------------------------------------------------------------
*/
app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
*/
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // Allow the frontend assets + Google script to load without a strict CSP fight.
  contentSecurityPolicy: false,
}));

/*
|--------------------------------------------------------------------------
| Global Rate Limiter
|--------------------------------------------------------------------------
*/
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
// Only rate-limit the API, not static asset requests.
app.use("/api", globalLimiter);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| Now that the frontend is served from this same origin, CORS is effectively
| same-origin. Kept for local dev (Vite on :5173 → backend on :4000).
*/
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.PROD_CLIENT_URL
        : process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/*
|--------------------------------------------------------------------------
| Body Parsers + Cookies
|--------------------------------------------------------------------------
*/
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
// NoSQL injection protection: strips MongoDB query operators from user input.
app.use(mongoSanitize);
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Health Check (under /api so it doesn't shadow the SPA at "/")
|--------------------------------------------------------------------------
*/
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Vocab Trainer API Running" });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/words", wordRoutes);
app.use("/api/v1/quiz", quizRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/alerts", alertRoutes);

/*
|--------------------------------------------------------------------------
| API 404 — JSON only for unmatched /api routes
|--------------------------------------------------------------------------
*/
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/*
|--------------------------------------------------------------------------
| Serve the built frontend
|--------------------------------------------------------------------------
*/
app.use(express.static(clientDist));

/*
|--------------------------------------------------------------------------
| SPA Fallback — any non-API GET returns index.html so React Router works
| (e.g. /library, /reset-password refreshed directly)
|--------------------------------------------------------------------------
*/
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;

  logger.error(`${statusCode} - ${message} - ${req.method} ${req.originalUrl} - ${err.stack}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;