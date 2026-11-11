# PROJECT AUDIT — VocabTrainer

**Stage:** 0 — Complete Codebase Audit and Architecture Planning  
**Status:** Audit complete. Application left unchanged and runnable.  
**Repository:** `D:\New folder (2)\VocabTrainer` (git repo, branch `main`, clean working tree)

---

## 1. Executive Summary

VocabTrainer is a personal vocabulary-learning application built as a monorepo with a Node.js/Express/Mongoose backend and a React/Vite/Tailwind frontend. The backend also serves the built frontend statically in production.

The application is functional and runnable:
- Frontend production build (`npm run build`) **succeeds**.
- Backend startup (`node src/server.js`) **succeeds** and connects to MongoDB Atlas.

No code changes were made during this audit. The existing application is preserved in its current state.

---

## 2. Repository Layout

```
VocabTrainer/
├── backend/
│   ├── .env                    (tracked in git — contains secrets, see Security Audit)
│   ├── .gitignore              (ignores .env only; .env was committed before ignore)
│   ├── package.json            (express, mongoose, bcryptjs, jsonwebtoken, google-auth-library,
│   │                             openai, cors, helmet, express-rate-limit, cookie-parser, dotenv)
│   ├── package-lock.json
│   ├── src/
│   │   ├── server.js           (entry: dotenv config, connectDB, app.listen)
│   │   ├── app.js              (Express app: helmet, CORS, rate limit, routes, static, error handler)
│   │   ├── config/db.js        (mongoose.connect)
│   │   ├── controllers/
│   │   │   ├── authController.js        (register, login, google, refresh, logout, me, update, forgot/reset password)
│   │   │   ├── wordController.js        (search, save, library, delete, lookup, update, bulk import)
│   │   │   └── quizController.js        (generate quiz, save/get attempts)
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js        (JWT access token verification)
│   │   │   ├── adminMiddleware.js       (role === "admin" gate)
│   │   │   └── dailyAiLimiter.js        (2 AI calls/day per user rate limit)
│   │   ├── models/
│   │   │   ├── User.js                  (username, email, password, provider, role, googleId,
│   │   │   │                              refreshTokens[], resetTokenHash/ExpiresAt)
│   │   │   ├── Word.js                  (userId, word, type, partOfSpeech, primaryDefinition, ...)
│   │   │   └── QuizAttempt.js           (userId, score, total, percentage, questions[])
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── wordRoutes.js
│   │   │   └── quizRoutes.js
│   │   └── utils/
│   │       ├── generateAccessToken.js
│   │       ├── generateRefreshToken.js
│   │       ├── generateSessionId.js
│   │       ├── hashToken.js             (SHA-256)
│   │       ├── openaiClient.js          (lazy OpenAI client)
│   │       ├── sendEmail.js             (Brevo SMTP API)
│   │       └── verifyGoogleToken.js     (google-auth-library OAuth2Client)
│   └── node_modules/
├── frontend/
│   └── auth-client/
│       ├── .env                  (VITE_API_URL, VITE_GOOGLE_CLIENT_ID)
│       ├── .gitignore            (ignores .env, dist, node_modules)
│       ├── package.json          (react, react-router-dom, axios, @react-oauth/google, tailwind)
│       ├── vite.config.js
│       ├── index.html
│       ├── src/
│       │   ├── main.jsx          (GoogleOAuthProvider + App)
│       │   ├── App.jsx           (router, public/authenticated routes, /admin/words admin gate)
│       │   ├── index.css         (@import tailwindcss)
│       │   ├── App.css           (empty)
│       │   ├── context/AuthContext.jsx  (login/register/google/logout/me/update, proactive refresh)
│       │   ├── api/axios.js      (axios instance, withCredentials, refresh interceptor)
│       │   ├── api/auth.js
│       │   ├── api/words.js
│       │   ├── api/quiz.js       (NOTE: uses raw axios, bypasses interceptors/auth)
│       │   ├── pages/            (AuthPage, Login, SearchPage, Library, Quiz, Profile,
│       │   │                       ForgotPassword, ResetPassword, Terms, Privacy,
│       │   │                       AdminWords, LibraryWordDetails)
│       │   ├── components/       (Navbar, WordCard, LibraryWordCard, ConfirmDeleteModal, SpeakButton)
│       │   └── ...
│       ├── public/favicon.svg
│       └── node_modules/
```

---

## 3. Frontend Architecture

- **Framework:** React 19 + Vite + Tailwind CSS v4 + React Router DOM v7.
- **State/Auth:** `AuthContext` holds `user`, `loading`, and auth actions (`login`, `register`, `loginWithGoogle`, `logout`, `updateUser`).
- **Token handling:** Access token stored in-memory in `api/axios.js`; sent as `Authorization: Bearer` header. Refresh performed via `/auth/refresh` with `withCredentials: true` (httpOnly refresh cookie). Single-flight refresh + proactive refresh-before-expiry timer.
- **API base:** `VITE_API_URL` (default `http://localhost:4000/api/v1`).
- **Routes (public):** `/forgot-password`, `/reset-password`, `/terms`, `/privacy`.
- **Routes (authenticated shell):** `/` (Search), `/library`, `/quiz`, `/profile`, `/library/:id`.
- **Admin route:** `/admin/words` — gated in frontend on `user.role === "admin"` (frontend-only enforcement, not trusted by backend for admin actions beyond the existing adminMiddleware).
- **Google OAuth:** `@react-oauth/google` with `VITE_GOOGLE_CLIENT_ID`.

**Notable frontend observations:**
- `api/quiz.js` imports `axios` directly instead of the configured `api` instance — quiz requests bypass auth headers, `withCredentials`, and the refresh interceptor.
- Admin UI (`AdminWords.jsx`) allows create/edit/delete/bulk-import of words; backend protects these with `adminMiddleware`.
- `Login.jsx` is a largely unused stub page; the real login lives in `AuthPage.jsx`.

---

## 4. Backend Architecture

### Entry & middleware stack (`src/app.js`)
1. `helmet` (CSP disabled; `crossOriginOpenerPolicy: same-origin-allow-popups`)
2. Global rate limiter: 300 requests / 15 min, applied to `/api` only
3. `cors`: origin from `CLIENT_URL` (dev) or `PROD_CLIENT_URL` (prod), `credentials: true`
4. `express.json` / `express.urlencoded` (10 kb limit)
5. `cookie-parser`
6. `GET /api/health` health check
7. Routes: `/api/v1/auth`, `/api/v1/words`, `/api/v1/quiz`
8. `express.static` serving `frontend/auth-client/dist`
9. SPA fallback `/*splat` → `index.html`
10. Global error handler (logs error, returns generic message in production)

### Authentication flow
- **Register:** `username`, `email`, `password` (min 8 chars). `bcrypt.hash` with `BCRYPT_SALT_ROUNDS` (default 12). Role hardcoded: `admin` if `email === "harshalkatkar76@gmail.com"`, else `user`.
- **Login:** `email` + `password`; local provider only (google accounts told to "continue with Google"). bcrypt compare. Refresh-token rotation: existing non-expired tokens pruned, max 5 sessions (oldest dropped), new token hashed (SHA-256) and stored with `sessionId` + `expiresAt`. Refresh cookie: `httpOnly`, `secure` in prod, `sameSite` strict/none, path `/api/v1/auth`, maxAge 7d if "remember". Access token returned in response body.
- **Google Login:** verifies `idToken` via `google-auth-library`, requires `email_verified`. Links or creates user. Same refresh flow. Role hardcoded same as register.
- **Refresh:** verifies refresh JWT, checks token hash exists in `user.refreshTokens`, rotates (removes old, issues new). **Reuse detection:** if hash not found, wipes ALL refresh tokens and clears cookie (aggressive session invalidation).
- **Logout:** removes token hash from user, clears cookie.
- **`GET /auth/me`, `PATCH /auth/me`:** protected by `authMiddleware`; update allows username/email (email locked for google provider).
- **Forgot/Reset password:** reset token hash + 30-min expiry, email via Brevo, generic response regardless of account existence (anti-enumeration). Reset clears all refresh tokens.

### AI integration
- OpenAI `gpt-4o-mini` via `openai` SDK.
- `POST /words/search`: library fast-path first, otherwise calls OpenAI for definition + spelling correction, re-checks library for corrected term.
- `POST /quiz/generate`: samples words from user's library, asks OpenAI for distractor definitions, builds MCQ.
- **Existing AI call restriction:** `dailyAiLimiter` middleware — `express-rate-limit` with `windowMs: 1 day`, `max: 2` requests per day per user (keyed by `userId`). **Unlimited for emails in `UNLIMITED_EMAILS` env (default `harshalkatkar76@gmail.com`).** Applied to `/words/search` and `/quiz/generate`.
- **The actual existing limit is 2 AI calls per day per user**, not a fixed total of 2–3.

### Models & relationships
- **User:** one-to-many `refreshTokens` (embedded), one-to-many `Word` (via `userId`), one-to-many `QuizAttempt` (via `userId`).
- **Word:** compound unique index `{ userId: 1, word: 1 }`.
- **QuizAttempt:** index `{ userId: 1, createdAt: -1 }`.

---

## 5. Existing AI Call Restriction (Task Item 9)

The restriction is implemented in `backend/src/middlewares/dailyAiLimiter.js`:

- **Limit:** 2 requests per 24-hour window per user.
- **Key:** `req.user?.userId` (falls back to `req.ip`).
- **Mounted on:** `POST /api/v1/words/search` and `POST /api/v1/quiz/generate` (after `authMiddleware`).
- **Bypass:** emails listed in `UNLIMITED_EMAILS` (default: `harshalkatkar76@gmail.com`) skip the limit entirely.
- **Not** a hard total of 2–3 calls; it is a rolling daily quota of 2.

This must be preserved in Stage 3 (free plan entitlement) rather than assumed to be exactly three.

---

## 6. Existing API Routes

| Method | Path | Middleware | Purpose |
|--------|------|------------|---------|
| GET | `/api/health` | none | Health check |
| POST | `/api/v1/auth/register` | `authLimiter` (10/15min) | Register |
| POST | `/api/v1/auth/login` | `authLimiter` | Login |
| POST | `/api/v1/auth/google` | `authLimiter` | Google login |
| POST | `/api/v1/auth/refresh` | `refreshLimiter` (60/15min) | Rotate refresh token |
| POST | `/api/v1/auth/logout` | none | Logout |
| GET | `/api/v1/auth/me` | `authMiddleware` | Current user |
| PATCH | `/api/v1/auth/me` | `authMiddleware` | Update profile |
| POST | `/api/v1/auth/forgot-password` | `authLimiter` | Password reset email |
| POST | `/api/v1/auth/reset-password` | `authLimiter` | Password reset |
| POST | `/api/v1/words/search` | `authMiddleware`, `dailyAiLimiter` | AI word search |
| POST | `/api/v1/words/save` | `authMiddleware` | Save word to library |
| GET | `/api/v1/words/library` | `authMiddleware` | List library |
| DELETE | `/api/v1/words/:id` | `authMiddleware` | Delete word |
| GET | `/api/v1/words/lookup/:word` | `authMiddleware`, `adminMiddleware` | Get specific word (admin-gated) |
| PATCH | `/api/v1/words/:id` | `authMiddleware`, `adminMiddleware` | Update word (admin-gated) |
| POST | `/api/v1/words/bulk-import` | `authMiddleware`, `adminMiddleware` | Bulk import (admin-gated) |
| POST | `/api/v1/quiz/generate` | `authMiddleware`, `dailyAiLimiter`, `quizLimiter` (30/15min) | Generate quiz |
| POST | `/api/v1/quiz/attempts` | `authMiddleware` | Save quiz attempt |
| GET | `/api/v1/quiz/attempts` | `authMiddleware` | List attempts |

---

## 7. Deployment Configuration

- **Platform:** Render (`PROD_CLIENT_URL=https://vocabtrainer-r85g.onrender.com`).
- Backend serves the frontend build statically; Render hosts the backend.
- `app.set("trust proxy", 1)` enabled for secure cookies behind Render's proxy.
- `CLIENT_URL=http://localhost:5173` for local Vite dev.
- No `render.yaml`, `Dockerfile`, or `procfile` found in the repo.
- `.env` is committed to git (tracked despite being in `.gitignore`) — contains production credentials.

---

## 8. Identified Bugs & Issues

1. **Secrets committed to git:** `.env` is tracked and contains `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGO_URI` (with password), `OPENAI_API_KEY`, `BREVO_API_KEY`. High severity.
2. **Hardcoded admin email:** Role assignment (`admin` vs `user`) is hardcoded to `harshalkatkar76@gmail.com` in `authController.js` for both register and google login. Frontend-supplied role info is not trusted, but the backend itself hardcodes privilege.
3. **`dailyAiLimiter` IPv6 keyGenerator bug:** `keyGenerator: (req) => req.user?.userId || req.ip` triggers `express-rate-limit` IPv6 validation error (`ERR_ERL_KEY_GEN_IPV6`) because raw `req.ip` is used without the `ipKeyGenerator` helper. Observed at startup.
4. **No input validation library:** All validation is manual/ad-hoc (no Joi/Zod/express-validator). Inconsistent sanitization across routes.
5. **No NoSQL injection protection:** No `express-mongo-sanitize`/`mongoose-sanitize`; user input flows directly into Mongoose queries.
6. **Access token in response body:** Access token returned in JSON body (vulnerable to XSS theft) rather than an httpOnly cookie.
7. **`api/quiz.js` bypasses axios instance:** Uses raw `axios`, so quiz requests lack auth headers, `withCredentials`, and refresh-interceptor logic.
8. **`adminMiddleware` only checks `role === "admin"`:** No `SUPER_ADMIN` role; no distinction between admin and super-admin operations.
9. **No email verification:** Accounts are usable immediately after registration; no verification flow.
10. **Google–local account linking risk:** If a user registers locally with a Google-owned email, a later Google login links the Google ID to that local account (`user.googleId = googleId; user.provider = "google"`), enabling potential account takeover.
11. **Refresh-token reuse wipes all sessions:** Detecting token reuse clears *every* refresh token for the user, not just the compromised session.
12. **Reset-password link uses `CLIENT_URL` directly:** If `CLIENT_URL` is attacker-controlled or misconfigured, reset links could point elsewhere (less critical since it's a fixed env value).
13. **Cookie path is narrow (`/api/v1/auth`):** Refresh cookie scoped to auth path only — intentional but limits flexibility.
14. **CORS origin from env without fallback validation:** If `CLIENT_URL`/`PROD_CLIENT_URL` is unset, `origin` is `undefined` (CORS may behave unexpectedly).
15. **`Login.jsx` stub page:** Unused duplicate login UI not wired into the router.

---

## 9. Security Weaknesses (summary; full detail in SECURITY_AUDIT.md)

- Committed secrets (`.env` in git).
- Hardcoded super-user email bypassing any provisioning flow.
- Missing NoSQL injection protection.
- Missing request validation/schema enforcement.
- Access token exposed in response body (XSS).
- Admin authorization based on a single role string with no super-admin segregation.
- Rate limiter IPv6 keyGenerator crash risk.
- No email verification before account use.
- Aggressive session invalidation on refresh-token reuse.
- No security-event logging or audit trail.

---

## 10. Existing Functionality That Must Be Preserved

- Local registration/login with bcrypt password hashing.
- Google OAuth login and account linking.
- Access token + rotating refresh token (httpOnly cookie) authentication.
- Password forgot/reset via email (Brevo).
- AI word search with spelling correction and library fast-path.
- Personal word library (save, list, delete, get, update).
- Quiz generation (AI distractors + fallback) and attempt saving/history.
- AI daily usage limit (2/day per user) — to be re-expressed as the "free plan" entitlement in Stage 3.
- Admin word management (create/edit/delete/bulk import) behind `adminMiddleware`.
- Frontend visual identity and vocabulary-learning experience.
- Render deployment compatibility.
- Backward-compatible database (no deletion/overwrite of existing user data).

---

## 11. Areas Needing Refactoring

- Extract validation into a shared schema layer (Joi/Zod or express-validator).
- Add NoSQL injection sanitization middleware.
- Centralize error handling and standardize API error responses.
- Extract auth token/cookie helpers into a service.
- Separate config validation at startup (fail fast on missing env vars).
- Introduce a logging service (currently `console.error` only).
- Split `authController` into smaller, single-responsibility modules.
- Add database indexes for new query patterns (admin, subscription, audit).

---

## 12. Dependencies That Need Modification (future stages)

| Dependency | Purpose | Stage |
|------------|---------|-------|
| `express-mongo-sanitize` (or `mongoose-sanitize`) | NoSQL injection protection | Stage 1 |
| `joi` or `zod` + `express-validator` | Request validation | Stage 1 |
| `winston` / `pino` | Structured logging | Stage 1 |
| `razorpay` | Payment integration | Stage 4 |
| `resend` | Email alerts | Stage 5 |

---

## 13. Verification Performed (Stage 0)

- Read all backend source files (controllers, models, routes, middlewares, utils, config).
- Read all frontend source files (pages, components, context, api, App, router).
- Confirmed `package.json` dependency lists for backend and frontend.
- Frontend production build: **succeeded** (`dist/` generated, ~376 KB JS).
- Backend startup: **succeeded** — connected to MongoDB Atlas and listened on port 4000.
- Git working tree: **clean**, on branch `main`, up to date with `origin/main`.

No code was modified. The application is left in a runnable state.

---

## 14. Proposed Deliverables for This Stage

- `PROJECT_AUDIT.md` (this file)
- `SECURITY_AUDIT.md`
- `IMPLEMENTATION_ROADMAP.md`

---

## 15. Next Step

Await explicit instruction to proceed to **Stage 1** (Existing Application Stabilization and Security Foundation).
