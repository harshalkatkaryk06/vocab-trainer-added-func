# SECURITY AUDIT — VocabTrainer

**Stage:** 0 — Complete Codebase Audit and Architecture Planning  
**Application:** VocabTrainer (backend + frontend)  
**Scope:** All backend source, frontend source, configuration, and environment files in the repository.

---

## 1. Executive Summary

The application is functional but has several security weaknesses that must be addressed before it can be considered production-ready. The most critical issue is that **secrets are committed to git** (`.env` is tracked), including JWT signing keys, the MongoDB connection string (with password), the OpenAI API key, and the Brevo API key.

No code changes were made during this audit. The application is left unchanged.

---

## 2. Severity Rating Scale

| Severity | Meaning |
|----------|---------|
| Critical | Immediate exploit potential; data/credentials exposed; must be fixed first |
| High | Likely exploit; significant attack surface; fix in Stage 1 |
| Medium | Exploitable under specific conditions; fix in Stage 1 or 2 |
| Low | Hardening / defense-in-depth; address over subsequent stages |

---

## 3. Critical Findings

### S-01: Secrets committed to git (Critical)

**File:** `backend/.env` (tracked in git; working tree clean means it is committed)

**What is exposed:**
- `JWT_ACCESS_SECRET` — access token signing key
- `JWT_REFRESH_SECRET` — refresh token signing key
- `MONGO_URI` — MongoDB Atlas connection string **including username and password**
- `OPENAI_API_KEY` — OpenAI API key
- `BREVO_API_KEY` — Brevo email API key
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (lower sensitivity, but still config)

**Impact:** Anyone with read access to the repository can forge JWTs, access the database, spend OpenAI quota, and send email through the Brevo account. Keys must be rotated and removed from git history.

**Remediation:**
- Add `.env` to `.gitignore` (already listed but file was committed before ignore).
- Remove `.env` from git tracking (`git rm --cached backend/.env`) without deleting the local file.
- Rotate all exposed secrets.
- Provide `backend/.env.example` with placeholder values.
- Add a pre-commit / CI check that rejects commits containing `.env` or real secret patterns.

---

## 4. High Findings

### H-01: Hardcoded admin email for role assignment (High)

**Files:** `backend/src/controllers/authController.js` (lines 63-66 and 273-276)

**Description:** The `role` field is set to `"admin"` when the registering/logging-in email equals `harshalkatkar76@gmail.com`, in both local registration and Google login. This hardcodes privilege into the authentication path and trusts no backend provisioning flow.

**Impact:** The initial admin is granted by email pattern rather than a controlled, auditable provisioning process. There is no `SUPER_ADMIN` role, no email verification before role grant, and no protection against accidental demotion.

**Remediation (Stage 2):**
- Introduce `USER`, `ADMIN`, `SUPER_ADMIN` roles.
- Make `SUPER_ADMIN_EMAIL` configurable via env (`harshalkatkar76@gmail.com`).
- Provision the initial Super Admin securely on the backend only; never trust frontend-supplied roles.
- Require email verification before granting any admin role.
- Ensure only the backend can change user roles.

### H-02: No NoSQL injection protection (High)

**Files:** All Mongoose query call sites across `authController.js`, `wordController.js`, `quizController.js`.

**Description:** User-supplied request body/query parameters are passed directly into Mongoose queries (e.g., `User.findOne({ email })`, `Word.findOne({ userId, word })`). No sanitization library (`express-mongo-sanitize` / `mongoose-sanitize`) is in use.

**Impact:** An attacker can send query-operator objects (`$gt`, `$ne`, `$regex`, etc.) in JSON bodies to bypass login, enumerate records, or manipulate queries.

**Remediation (Stage 1):**
- Add `express-mongo-sanitize` middleware globally (or per route).
- Sanitize all user input before it reaches Mongoose.
- Add input validation schemas so only expected scalar shapes are accepted.

### H-03: No request validation / schema enforcement (High)

**Files:** All route handlers; validation is manual and ad-hoc.

**Description:** There is no validation library (Joi, Zod, express-validator). Field presence, type, length, and format checks are hand-rolled and inconsistent. For example, `updateCurrentUser` validates username length and email regex inline; other routes perform minimal checks.

**Impact:** Malformed or malicious payloads can reach the database or business logic, causing crashes, inconsistent data, or bypassed business rules.

**Remediation (Stage 1):**
- Add a validation layer (Zod or Joi) with schemas for every request body/query/param.
- Reject invalid requests with `400` before reaching controllers.
- Centralize validation error formatting.

### H-04: Access token returned in response body (High)

**Files:** `backend/src/controllers/authController.js` (login, googleLogin, refresh return `accessToken` in JSON body).

**Description:** The JWT access token is delivered in the response body rather than an httpOnly cookie. JavaScript running on the page can read it.

**Impact:** Any XSS vulnerability in the frontend allows theft of the access token and impersonation of the user. Combined with the refresh cookie, an attacker with the access token can act as the user until the token expires.

**Remediation (Stage 1):**
- Move the access token into an httpOnly, Secure, SameSite cookie, or
- At minimum, keep it in memory only (frontend already stores it in module scope) and avoid logging it.
- Evaluate whether the access token needs to be exposed to frontend code at all.

### H-05: `dailyAiLimiter` IPv6 keyGenerator crash (Medium-High)

**File:** `backend/src/middlewares/dailyAiLimiter.js` (line 22)

**Description:** `keyGenerator: (req) => req.user?.userId || req.ip` uses raw `req.ip`. `express-rate-limit` v8 validates that IP-based key generators use the `ipKeyGenerator` helper for IPv6 safety. At startup this raises `ERR_ERL_KEY_GEN_IPV6`.

**Impact:** The limiter may fail or behave incorrectly for IPv6 clients; the observed startup validation error indicates this is an active defect.

**Remediation (Stage 1):**
- Use `rateLimit.ipKeyGenerator()` for the IP fallback path, or key solely on `userId` (authenticated routes) and skip IP fallback.

### H-06: `api/quiz.js` bypasses the configured axios instance (Medium)

**File:** `frontend/auth-client/src/api/quiz.js`

**Description:** `generateQuiz`, `saveQuizAttempt`, and `getQuizAttempts` use raw `axios` instead of the shared `api` instance. These requests therefore lack:
- The `Authorization: Bearer` access token header,
- `withCredentials: true` (refresh cookie not sent),
- The response interceptor's refresh-on-401 logic.

**Impact:** Quiz endpoints may fail with 401 when the access token is present but not attached, or fail silently because the refresh cookie is not sent.

**Remediation (Stage 1):**
- Refactor `api/quiz.js` to import and use the shared `api` instance like `auth.js` and `words.js`.

---

## 5. Medium Findings

### M-01: `adminMiddleware` has no SUPER_ADMIN segregation (Medium)

**File:** `backend/src/middlewares/adminMiddleware.js`

**Description:** Grants access to any user with `role === "admin"`. There is no distinction between `ADMIN` and `SUPER_ADMIN`, and no super-admin-only operations.

**Impact:** Once a user is an admin, they can access all admin-gated routes with no tiered authorization.

**Remediation (Stage 2):**
- Add role-based middleware (`requireRole`, `requireSuperAdmin`, `requireAdminOrAbove`).
- Define `USER < ADMIN < SUPER_ADMIN` precedence.

### M-02: No email verification (Medium)

**Description:** Accounts are usable immediately after registration; there is no email-confirmation step. Password reset is the only email-based identity check.

**Impact:** Unverified or mistyped emails can create accounts; password-reset is the only recovery signal. This weakens identity assurance for any future role or subscription grant tied to email.

**Remediation (Stage 2):**
- Add `isEmailVerified` field to `User`.
- Send a verification email on registration; gate sensitive actions (admin role grant, paid entitlement) on verified email.

### M-03: Google–local account linking risk (Medium)

**File:** `backend/src/controllers/authController.js` (googleLogin, lines 238-243)

**Description:** If a user registers locally with an email that later signs in via Google, the backend sets `user.googleId = googleId` and `user.provider = "google"` on the existing local account.

**Impact:** An attacker who registers locally with a victim's Google email can later be linked when the victim signs in with Google, or the local registrant can claim the Google identity.

**Remediation (Stage 1/2):**
- Do not auto-link a Google ID to an existing local account unless the local account's email ownership is proven (e.g., via password or verification).
- Require explicit account linking with re-authentication.

### M-04: Refresh-token reuse wipes all sessions (Medium)

**File:** `backend/src/controllers/authController.js` (refreshToken, lines 393-395)

**Description:** On refresh-token reuse (hash not found), the backend sets `user.refreshTokens = []`, invalidating every session for that user.

**Impact:** A single replayed token logs the user out of all devices, a denial-of-service for the user and a blunt response to token reuse.

**Remediation (Stage 1):**
- On reuse detection, invalidate only the suspicious session (or flag the user for review) rather than wiping all tokens; log a security event.

### M-05: Password reset uses `CLIENT_URL` directly (Medium)

**File:** `backend/src/controllers/authController.js` (forgotPassword, line 631)

**Description:** The reset URL is built as `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`.

**Impact:** If `CLIENT_URL` is misconfigured or influenced by user input, reset links could be redirected to an attacker-controlled domain (open-redirect-style). It is currently a fixed env value, so risk is limited to misconfiguration.

**Remediation (Stage 1):**
- Validate `CLIENT_URL` against an allowlist at startup.
- Use a relative or configured front-end reset route that does not vary per request.

---

## 6. Low Findings

### L-01: Narrow refresh-token cookie path (Low)

**Description:** Refresh cookie path is `/api/v1/auth` only. This is intentional but limits cookie sharing across the app if refresh is needed elsewhere.

**Remediation:** Review cookie path needs in Stage 6; no immediate change required.

### L-02: CORS origin derived from env without validation (Low)

**Description:** `app.use(cors({ origin: NODE_ENV === "production" ? PROD_CLIENT_URL : CLIENT_URL, ... }))`. If the env var is unset, `origin` is `undefined`.

**Remediation:** Validate `CLIENT_URL` / `PROD_CLIENT_URL` at startup; provide safe defaults.

### L-03: Logging is `console.error` only (Low)

**Description:** No structured logging, no log levels, no security-event log.

**Remediation (Stage 1/5):** Add a logging service (winston/pino) and a security-event store.

### L-04: `Login.jsx` stub page (Low)

**Description:** An unused duplicate login page is not wired into the router.

**Remediation:** Remove or integrate; no security impact if unused.

### L-05: `express.static` serves frontend from backend (Low, architectural)

**Description:** Backend serves `frontend/auth-client/dist`. This couples frontend and backend deployment.

**Remediation:** Acceptable for current Render setup; document as a deployment consideration.

---

## 7. Security Controls Already in Place

| Control | Location | Status |
|---------|----------|--------|
| bcrypt password hashing (12 rounds) | `authController.js` | Present |
| JWT access + rotating refresh tokens | `authController.js`, utils | Present |
| Refresh tokens stored as SHA-256 hashes | `hashToken.js`, `User.js` | Present |
| httpOnly, Secure, SameSite refresh cookie | `authController.js` | Present |
| Refresh-token rotation on use | `authController.js` | Present |
| Per-route auth rate limiting (10/15min) | `authRoutes.js` | Present |
| Global API rate limiting (300/15min) | `app.js` | Present |
| helmet security headers | `app.js` | Present (CSP disabled) |
| CORS with credentials | `app.js` | Present |
| Anti-email-enumeration on forgot password | `authController.js` | Present |
| Generic reset response regardless of account existence | `authController.js` | Present |
| Google ID token verification | `verifyGoogleToken.js` | Present |
| `trust proxy` for Render | `app.js` | Present |

---

## 8. Required Environment Variables (current)

| Variable | Purpose | Status |
|----------|---------|--------|
| `ACCESS_TOKEN_EXPIRY` | Access token TTL | Set |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost | Set |
| `BREVO_API_KEY` | Brevo email API key | Set (committed — rotate) |
| `BREVO_SENDER_EMAIL` | Brevo sender email | Set |
| `BREVO_SENDER_NAME` | Brevo sender name | Set |
| `CLIENT_URL` | Frontend URL (dev) | Set |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Set |
| `JWT_ACCESS_SECRET` | Access token secret | Set (committed — rotate) |
| `JWT_REFRESH_SECRET` | Refresh token secret | Set (committed — rotate) |
| `MONGO_URI` | MongoDB connection string | Set (committed — rotate; contains password) |
| `NODE_ENV` | Environment | Set |
| `OPENAI_API_KEY` | OpenAI API key | Set (committed — rotate) |
| `PROD_CLIENT_URL` | Frontend URL (prod) | Set |
| `REFRESH_COOKIE_NAME` | Refresh cookie name | Set |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL | Set |
| `UNLIMITED_EMAILS` | AI-limit bypass emails | Default in code |

**Missing for future stages:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_SENDER_NAME`, `ALERT_EMAIL`, `SUPER_ADMIN_EMAIL`.

---

## 9. Recommendations Summary (by stage)

**Stage 1:**
- Remove `.env` from git; rotate all secrets; create `.env.example`.
- Add NoSQL injection sanitization (`express-mongo-sanitize`).
- Add request validation (Zod/Joi + express-validator).
- Add startup env validation (fail fast on missing required vars).
- Add structured logging.
- Fix `dailyAiLimiter` IPv6 keyGenerator.
- Refactor `api/quiz.js` to use the shared axios instance.
- Address Google–local account linking.

**Stage 2:**
- Introduce `USER` / `ADMIN` / `SUPER_ADMIN` roles.
- Configure `SUPER_ADMIN_EMAIL` via env; provision initial Super Admin securely.
- Add role-based authorization middleware.
- Add email verification before role grants.
- Add audit-log collection for admin/security events.

**Stage 3–7:** Addressed in the implementation roadmap (subscription entitlements, Razorpay, Resend alerts, admin dashboard, production hardening).

---

## 10. Verification Performed (Stage 0)

- Read every backend and frontend source file listed in `PROJECT_AUDIT.md`.
- Confirmed `.env` is tracked in git (working tree clean).
- Confirmed backend starts and connects to MongoDB Atlas.
- Confirmed frontend production build succeeds.
- Observed `ERR_ERL_KEY_GEN_IPV6` validation error from `dailyAiLimiter` at startup.

No code was modified. The application is left unchanged and runnable.

---

**Awaiting explicit instruction to proceed to Stage 1.**
