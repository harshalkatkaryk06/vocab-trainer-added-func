# IMPLEMENTATION ROADMAP — VocabTrainer

**Stage:** 0 — Architecture Planning  
**Basis:** `PROJECT_AUDIT.md` and `SECURITY_AUDIT.md`  
**Constraint:** Implement strictly one stage at a time; do not proceed to the next stage without explicit instruction.

---

## 0. Guiding Principles (Global Rules)

1. Only work on the currently authorized stage.
2. Never proceed automatically to the next stage.
3. Keep the application runnable at every checkpoint.
4. Complete the current stage before stopping.
5. Perform two independent verification passes (functional + regression) before every stop.
6. Fix failures before declaring completion.
7. Preserve all previously completed stages.
8. Do not introduce broken placeholders.
9. Do not disable existing features to make new features appear functional.
10. Never expose secrets in frontend code, git, logs, or reports.
11. Keep the database backward-compatible; preserve existing user data.
12. Do not delete or overwrite existing user records during migrations.
13. Do not commit or push without explicit instruction.
14. External integrations (Razorpay, Resend, Google OAuth) must be implemented in code even without credentials; use test doubles for automated tests; never claim live-tested without real credentials.

---

## 1. Stage 0 — Complete (this stage)

**Goal:** Audit and plan; no feature implementation.

**Deliverables created:**
- `PROJECT_AUDIT.md` — existing architecture, features, bugs, models, routes, AI restriction analysis.
- `SECURITY_AUDIT.md` — severity-rated findings, secrets-in-git critical issue, remediation map.
- `IMPLEMENTATION_ROADMAP.md` (this file).

**Verification:** Frontend production build succeeds; backend starts and connects to MongoDB; git working tree clean.

**Status:** COMPLETE. Stopping; awaiting instruction to proceed to Stage 1.

---

## 2. Stage 1 — Existing Application Stabilization and Security Foundation

**Goal:** Harden the existing application before adding major functionality. Preserve all existing auth (incl. Google login) and AI/quiz/vocabulary behavior.

### 2.1 Tasks

1. **Environment configuration**
   - Create `backend/.env.example` with all required variables (placeholders only, no real secrets).
   - Validate required environment variables at startup (fail fast with clear messages).
   - Ensure `.env` is removed from git tracking (keep local file).

2. **Secrets rotation**
   - Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGO_URI` password, `OPENAI_API_KEY`, `BREVO_API_KEY`.
   - Never hardcode production credentials.

3. **Authentication & JWT**
   - Keep existing login/register/google/refresh/logout behavior.
   - Consider moving access token to httpOnly cookie (or keep in memory; do not log it).
   - Add standardized error responses.

4. **Refresh token rotation**
   - Keep rotation; on reuse detection, invalidate only the suspicious session + log a security event (do not wipe all sessions).

5. **Cookie security**
   - httpOnly, Secure (prod), SameSite, correct path; validate `CLIENT_URL`/`PROD_CLIENT_URL` at startup.

6. **Password hashing**
   - Keep bcrypt (12 rounds); ensure `BCRYPT_SALT_ROUNDS` validated.

7. **Input validation**
   - Add a validation library (Zod or Joi + express-validator).
   - Schemas for register, login, forgot/reset, profile update, word save/search, quiz generate.

8. **API error handling**
   - Centralized, standardized error responses; no stack traces in production.

9. **CORS**
   - Validate origin env vars; safe defaults.

10. **Helmet**
    - Keep; consider enabling a restrictive CSP in production.

11. **Rate limiting**
    - Keep global (300/15min) and auth (10/15min) limiters.
    - Fix `dailyAiLimiter` IPv6 keyGenerator (`rateLimit.ipKeyGenerator()`).

12. **NoSQL injection protection**
    - Add `express-mongo-sanitize` globally.

13. **Database connection management**
    - Keep mongoose.connect; add connection error handling / retry.

14. **Logging**
    - Add structured logging (winston/pino); security-event logging.

15. **Frontend fix**
    - Refactor `api/quiz.js` to use the shared `api` instance (auth headers, withCredentials, refresh interceptor).

16. **Google–local account linking**
    - Do not auto-link Google ID to existing local account without proof of email ownership.

### 2.2 Environment variables to add to `.env.example`

All current variables plus documentation. New Stage-1-specific: none (uses existing). Add `SUPER_ADMIN_EMAIL=harshalkatkar76@gmail.com` placeholder (used in Stage 2, documented here for completeness).

### 2.3 Testing (Stage 1)

- Registration, login, Google login, refresh token, logout, invalid credentials.
- Existing AI functionality (search, quiz).
- Existing vocabulary-learning functionality (save, library, delete).
- Frontend build; backend startup.
- Input validation rejection of malformed payloads.
- NoSQL injection attempt rejection.

### 2.4 Checkpoint 1 exit criteria

- Application fully usable with existing functionality.
- Both verification passes green.
- Detailed change report, security improvements, test results, known limitations, manual testing instructions, required env config.

---

## 3. Stage 2 — Admin System, RBAC and Initial Super Admin

**Goal:** Add roles (USER / ADMIN / SUPER_ADMIN), provision the initial Super Admin, and build the admin dashboard foundation.

### 3.1 Database changes
- `User.role`: enum `["user", "admin", "super_admin"]` (default `"user"`).
- New `AuditLog` collection: actorId, actorEmail, action, targetType, targetId, metadata, ip, createdAt. Index on createdAt and actorId.
- New `SecurityEvent` collection (or reuse AuditLog with severity): type, severity, userId, ip, userAgent, createdAt.

### 3.2 Backend
- Startup provisioning: if no `super_admin` exists and `SUPER_ADMIN_EMAIL` is set, create the Super Admin account (email verified by default, or mark verified). Only when DB is empty of admins.
- `requireRole(...)`, `requireAdminOrAbove`, `requireSuperAdmin` middleware (run after `authMiddleware`).
- Admin routes:
  - `GET /api/v1/admin/users` — list users (Super Admin / Admin).
  - `POST /api/v1/admin/users/:id/role` — change role (Super Admin only).
  - `POST /api/v1/admin/admins` — create admin (Super Admin only).
  - `DELETE /api/v1/admin/admins/:id` — revoke admin (Super Admin only; protect initial Super Admin from demotion/deletion).
  - `GET /api/v1/admin/admins` — list admins.
  - `GET /api/v1/admin/audit-logs` — view audit logs (Super Admin / Admin).
  - `GET /api/v1/admin/security-events` — view security events.
- Audit logging: admin creation, role changes, user account actions, unauthorized admin access, administrative actions.
- Email verification prerequisite before granting admin role.

### 3.3 Frontend
- Admin dashboard shell with sections: Overview, User Management, Admin Management, Security Events, Audit Logs.
- Role-based route guards (backend-enforced; frontend UI hints only).

### 3.4 Testing
- Super Admin initialization; normal user denial; admin access; Super Admin-only ops; admin creation/revocation; protection of initial Super Admin; direct API access without auth.

### 3.5 Checkpoint 2 exit criteria
- Existing users unaffected; admin panel usable by initial Super Admin; both verification passes green.

---

## 4. Stage 3 — Subscription Architecture, Plans and AI Entitlements

**Goal:** Implement the subscription foundation independent of Razorpay; re-express the existing AI limit as the free plan entitlement.

### 4.1 Database changes
- `Plan` collection: name (free/paid), price, aiCalls (number or "unlimited"), durationDays, active, createdAt.
- `UserSubscription` / `Entitlement` collection: userId, planId, type (manual/purchase), startDate, expiryDate, status (active/expired/revoked), grantedBy, revokedBy, revokedAt, revocationReason.
- `AIUsage` collection (or counter on User): userId, periodStart, callsConsumed, resetAt. Index on userId + periodStart.
- Keep existing `Word`, `QuizAttempt`, `User` unchanged.

### 4.2 Backend services
- `PlanService`: list plans, get plan, activate/deactivate plans.
- `SubscriptionService`: grant manual access (admin), revoke, check expiry, compute effective entitlement.
- Precedence rules: purchased subscription vs manually granted entitlement; do not overwrite payment records when admin grants manual access.
- `AIUsageService`: atomic increment (findOneAndUpdate / $inc) for quota consumption; enforce on backend only.
- Enforce: free plan = existing daily limit (2 calls/day per user); paid = unlimited while active; expired = revert to free; revoked = lose paid privileges.

### 4.3 Frontend
- Plans page: current plan, total allowed, consumed, remaining, upgrade option.
- Account page: current plan indicator, subscription expiration, usage indicator.

### 4.4 Testing
- Free users; admin-granted paid users; expiring entitlements; revoked entitlements; frontend quota manipulation prevention; concurrent request protection.

### 4.5 Checkpoint 3 exit criteria
- Razorpay not required; both verification passes green; manual test cases and results.

---

## 5. Stage 4 — Razorpay Payment Integration

**Goal:** Integrate Razorpay into the subscription architecture.

### 5.1 Environment variables
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (test mode).

### 5.2 Backend
- `POST /api/v1/subscriptions/create-order` — validate plan, create Razorpay order (amount computed on backend), return orderId.
- Frontend opens Razorpay Checkout with orderId + keyId (keyId only; never secret).
- `POST /api/v1/subscriptions/verify` — verify payment signature (razorpay_order_id, razorpay_payment_id, razorpay_signature).
- Webhook endpoint `POST /api/v1/webhooks/razorpay` — verify webhook signature, idempotent handling of `payment.captured`, `payment.failed`, `order.paid`; activate subscription; prevent duplicate activation.
- `GET /api/v1/subscriptions/transactions` — user transaction history.
- Store transaction history; support reconciliation.

### 5.3 Admin panel
- Payment history, payment status, user payment info, subscription status, transaction references.

### 5.4 Testing
- Use test doubles/mocks for Razorpay; never fake successful production payments; demonstrate order/verification logic via automated tests.

### 5.5 Checkpoint 4 exit criteria
- Integration implemented; without credentials, automated tests demonstrate logic; exact Razorpay + webhook configuration instructions provided.

---

## 6. Stage 5 — Resend Monitoring and Security Alert System

**Goal:** Centralized monitoring and notification infrastructure via Resend.

### 6.1 Environment variables
- `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_SENDER_NAME`, `ALERT_EMAIL=harshalkatkar76@gmail.com`.

### 6.2 Backend
- `AlertService`: send email via Resend; severity INFO/WARNING/CRITICAL; centralized event storage; thresholds; deduplication; throttling; retry handling; email templates; secure notification logging.
- Events: failed/successful logins, repeated incorrect passwords, Google auth failures, password resets, suspicious refresh token activity, AI provider failures, DB failures, unexpected errors, unusual AI usage, payment failures/verification failures/webhook failures/subscription activation failures, unauthorized admin access, privilege changes.

### 6.3 Admin panel
- Security Events, System Events, Authentication Monitoring, AI Usage Monitoring, Alert History.

### 6.4 Testing
- Operational without real Resend key (test doubles); event simulation instructions; Resend configuration instructions.

### 6.5 Checkpoint 5 exit criteria
- Both verification passes green; no email on every normal request.

---

## 7. Stage 6 — Complete Admin Dashboard and Frontend Improvements

**Goal:** Polish the complete user and administrative experience.

### 7.1 Admin dashboard (11 sections)
Overview, User Management, Admin Management, Plans, Subscriptions, Payments, AI Usage, Authentication Monitoring, Security Events, System Health, Audit Logs.

### 7.2 User dashboard
Account section, current plan indicator, AI usage info, subscription expiration, payment history, Plans page, upgrade experience.

### 7.3 UI requirements
Professional consistent design, responsive desktop/mobile, reusable components, loading/error/empty states, form validation, accessible interactions, consistent navigation. Preserve VocabTrainer visual identity.

### 7.4 Checkpoint 6 exit criteria
- Every new screen verified; both verification passes green; screenshots/descriptions + manual testing instructions.

---

## 8. Stage 7 — Final Production Readiness, Security Audit and Deployment

**Goal:** Comprehensive final audit and deployment preparation.

### 8.1 Security audit (re-inspect)
Authentication, authorization, admin privileges, AI quota enforcement, subscription entitlements, payment verification, webhook handling, DB security, env vars, logging, rate limits, CORS, cookie config.

### 8.2 Performance and reliability
DB indexes, slow queries, API response handling, frontend build size, error handling, graceful shutdown, health checks, external service timeouts, retry handling, monitoring reliability.

### 8.3 Deployment
Maintain Render compatibility unless compelling reason to change. Production env config, updated `.env.example`, updated README, deployment guide, DB init/migration instructions, Razorpay webhook config, Resend domain/sender config, Google OAuth config.

### 8.4 Final testing
Complete backend tests, frontend build, auth tests, admin authorization, subscription, AI quota, payment, webhook, monitoring, regression tests.

### 8.5 Final checkpoint exit criteria
Complete report with architecture changes, features, security improvements, tests/results, integrations, env vars, deployment instructions, limitations, known issues. Do not claim production-ready if critical tests fail or security issues remain.

---

## 9. Database Change Summary (forward-looking, backward-compatible)

| Collection | Change | Stage |
|------------|--------|-------|
| `users` | `role` enum adds `super_admin`; add `isEmailVerified` | 2 |
| `audit_logs` | new collection | 2 |
| `security_events` | new collection | 2 |
| `plans` | new collection | 3 |
| `subscriptions` / `entitlements` | new collection | 3 |
| `ai_usage` | new collection (or counter) | 3 |
| `transactions` | new collection | 4 |

No existing collections or fields are removed; existing user data is preserved.

---

## 10. Order of Execution

Stage 0 (done) → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7.

Each stage ends with a completion report and an explicit stop. The next stage begins only on explicit instruction.

**Awaiting instruction to proceed to Stage 1.**
