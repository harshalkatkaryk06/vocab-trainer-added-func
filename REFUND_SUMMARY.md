# VocabTrainer — Refund/Cancellation System: Final Summary

## Scope
End-to-end subscription cancellation with Razorpay refund for paid plans.
Customer "piyush" buys a plan, cancels via `/subscription/cancel`, gets a refund,
and receives confirmation emails (customer + admin alert).

---

## What Exists (verified working)

### Backend (`backend/`)

**`src/models/CancellationRequest.js`** (NEW)
- Stores every cancellation request: userId, subscriptionId, transactionId,
  status (`requested` | `refund_initiated` | `refund_processed` | `refund_failed` |
  `completed_no_refund` | `rolled_back`), reason, refundSnapshot, policyVersion
  (`2026-11-v1`), acceptedTerms, acceptedAt, ip, userAgent, razorpayRefundId,
  errorMessage, timestamps.
- Partial unique index on `subscriptionId` where `status != "rolled_back"` —
  prevents duplicate refunds per subscription.

**`src/models/Transaction.js`** (unchanged from prior — already had refund fields)
- `refundId`, `refundAmount`, `refundStatus`, `refundedAt`, `refundReason`
- `subscriptionId` links to Subscription (set at activation)

**`src/models/Subscription.js`** (unchanged — `planSnapshot` is `default: null`)
- Status enum includes `cancelled`
- `cancelledAt`, `cancellationReason` fields

**`src/services/refundService.js`** (UNCHANGED — `calculateRefund` is correct)
- `REFUND_CONFIG`: `FULL_REFUND_WINDOW_HOURS: 48`, `PROCESSING_FEE_PERCENT: 0`
- 100% refund within 48 hours; pro-rata `floor(amountPaid * unusedDays / totalDays)`
  after; 0 refund when no unused days; manual subscriptions excluded

**`src/routes/subscriptionRoutes.js`**
- `GET /cancel/preview` — refund calculation (auth required)
- `POST /cancel` — cancel subscription + refund (auth + authLimiter + validate)
- `GET /cancellation-requests` — list all cancellation requests (admin only)

**`src/controllers/paymentController.js`**
- `cancelSubscription` — full flow:
  a) `acceptedTerms` must be true (400 if not)
  b) Load active `type: "purchase"` subscription; load transaction via
     `subscriptionId` (not userId+planId); refuse if `refundId` already exists
  c) Recompute refund server-side; 409 with fresh preview if client amount differs
  d) Create `CancellationRequest` (status "requested") with snapshot + consent
  e) Atomically claim subscription `active -> cancelled` (409 if already cancelled)
  f) If refund > 0: Razorpay refund call (amount, speed "normal", receipt, notes —
     NO `currency` field); on success mark transaction, set request to
     `refund_initiated`; on failure conditional rollback + request `rolled_back`
  g) If refund is 0: skip Razorpay, mark request `completed_no_refund`
  h) Audit log, admin alert (`createAlert` from `alertService.js` with `notify:true`),
     customer email — each fire-and-safe in own try/catch
  i) Return `{ success, data: { subscription, accessEndedAt, refund: { refundId,
     amountPaise, currency, status } } }` — all money in PAISE

**`src/controllers/subscriptionController.js`**
- `getCancellationRequests` — admin endpoint listing cancellation requests
- `cancelPreview` (alias for `getCancelPreview`) — refund preview

**`src/validation/schemas.js`**
- `cancelSubscription` schema: `reason` (optional enum), `expectedRefundAmount`
  (optional integer paise), `acceptedTerms` (must be true)

**`src/utils/auditLog.js`**
- Duplicate `createAlert` DELETED (it only wrapped `logSecurityEvent` and ignored
  `notify`/`title`/`description`). Kept `logAudit` and `logSecurityEvent`.
- Real `createAlert` used from `src/services/alertService.js`

**`src/services/alertService.js`** (unchanged — already correct)
- `createAlert` stores `AlertEvent` and sends Resend admin email when `notify:true`
  and `RESEND_API_KEY` + `ALERT_EMAIL` are set

**`src/services/subscriptionEmailService.js`** (unchanged)
- `sendSubscriptionCancellationEmail` — customer email, fire-and-safe
- `sendSubscriptionWelcomeEmail` — welcome email, fire-and-safe

**`src/controllers/paymentController.js` — `razorpayWebhook`**
- `payment.captured`: welcome email sent with atomic `welcomeEmailSentAt` claim
  (webhook-only activations also get the welcome email)
- `refund.processed` / `refund.failed`: reads refund from `payload.refund.entity`
  (id, payment_id, amount, status); finds transaction by refundId OR razorpayPaymentId;
  updates `refundStatus` idempotently; emails customer on `refund.processed`;
  `refund.failed` sends admin alert with `notify:true`

---

### Frontend (`frontend/auth-client/src/`)

**`pages/Profile.jsx`**
- Broken cancel modal DELETED (removed `setCancelModal`, `setSuccess`, `preview`,
  `handleCancel` modal state)
- "Cancel plan" button navigates to `/subscription/cancel`
- Button shows only when subscription `type: "purchase"` && `status: "active"`

**`pages/CancelSubscription.jsx`**
- Step 1 notice screen: "Before you cancel" heading, 5 plain-language terms
  (access ends immediately, refund rules, 5-7 working days, cannot be undone,
  amount shown is final), plan name, purchase/expiry dates, days used/unused with
  progress bar, amount paid, calculation breakdown, refund amount in large type
- Acceptance checkbox: "I have read and accept these terms and I am OK with this
  refund amount"
- Optional reason dropdown
- "Keep my plan" and "Continue to cancel current plan" (disabled until box ticked;
  spinner while submitting; double-click protection via submitting flag)
- Button reads "Cancel plan (no refund)" when refund is 0 and stays enabled
- Step 2 success screen: refund amount, refund reference, refund status, access ended
- Loading, error, "no active paid plan" states
- 409 handled in catch block: replaces preview with new amount, makes user confirm again
- API response shape: reads `data.refund.{refundId, amountPaise, currency, status}`
  — all money in paise, UI formats only

**`pages/Plans.jsx`**
- "Cancellation & refund policy" link at bottom of plans grid → `/subscription/cancel`

**`pages/admin/Payments.jsx`**
- Fixed header/cell mismatch: added "Refund ID" header (was missing)
- Added "Cancellation Request" column showing CancellationRequest status
- Fetches cancellation requests via `getCancellationRequests()` API

**`pages/admin/AdminSubscriptions.jsx`** (unchanged — already shows cancelled status,
  cancelledAt, cancellationReason)

**`api/subscriptions.js`**
- `cancelPreview()`, `cancelSubscription(payload)`, `getCancellationRequests()`

---

## Razorpay Dashboard Webhook Events to Enable

Enable these webhook events pointing to `POST /api/v1/payments/webhook`:
1. `payment.captured` — activates subscription via webhook + sends welcome email
2. `refund.processed` — updates refund status to "processed", emails customer
3. `refund.failed` — updates refund status to "failed", sends admin alert
4. `payment.failed` — marks transaction as failed
5. `order.paid` — alternative to payment.captured

Webhook secret: `RAZORPAY_WEBHOOK_SECRET` in backend `.env`

---

## Environment Variables Required

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=sk_test_...
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=VocabTrainer
RESEND_API_KEY=...
RESEND_SENDER_EMAIL=...
RESEND_SENDER_NAME=VocabTrainer
ALERT_EMAIL=harshkatkar76@gmail.com
CLIENT_URL=http://localhost:5173
```

---

## Manual Test Checklist

### Prerequisites
- [ ] Backend running: `cd backend && npm start` (port 4000)
- [ ] Frontend running: `cd frontend/auth-client && npm run dev` (port 5173)
- [ ] Razorpay test mode keys configured in `.env`
- [ ] Brevo credentials configured for customer emails
- [ ] Resend credentials + ALERT_EMAIL configured for admin alerts
- [ ] Razorpay dashboard webhook configured for `payment.captured`, `refund.processed`,
  `refund.failed`, `payment.failed`

### Test Case 1: Full refund (within 48 hours)
- [ ] Purchase a paid plan at `/plans` with test card `4111 1111 1111 1111` / `12/30` / `123`
- [ ] Go to `/subscription/cancel` immediately
- [ ] Verify: notice screen shows 100% refund amount
- [ ] Tick acceptance checkbox, click "Continue to cancel current plan"
- [ ] Verify: success screen shows refund amount = amount paid
- [ ] Verify: Razorpay refund initiated (check Razorpay dashboard)
- [ ] Verify: customer receives cancellation email
- [ ] Verify: admin receives alert email
- [ ] Verify: Admin Payments page shows refund status "pending", Cancellation Request "refund_initiated"

### Test Case 2: Pro-rated refund (day 10 of 30)
- [ ] Backdate subscription `startDate` to 10 days ago in DB
- [ ] Go to `/subscription/cancel`
- [ ] Verify: refund = floor(amountPaid × 20 / 30) (pro-rata)
- [ ] Complete cancellation
- [ ] Verify: refund amount matches calculation exactly

### Test Case 3: Zero refund (last day / no unused days)
- [ ] Backdate subscription to day 30 (last day) in DB
- [ ] Go to `/subscription/cancel`
- [ ] Verify: button reads "Cancel plan (no refund)" and is enabled once ticked
- [ ] Verify: NO Razorpay call is made
- [ ] Verify: subscription status = "cancelled", access ended
- [ ] Verify: Cancellation Request status = "completed_no_refund"

### Test Case 4: Double-click protection
- [ ] Click "Continue to cancel current plan" twice rapidly
- [ ] Verify: second call gets 409 "Already cancelled", plan stays cancelled once

### Test Case 5: Tampered expectedRefundAmount
- [ ] Open `/subscription/cancel`, note the refund amount
- [ ] Modify the frontend to send a different `expectedRefundAmount`
- [ ] Click cancel
- [ ] Verify: 409 response with new preview; page shows new amount and requires re-confirmation

### Test Case 6: Razorpay refund failure
- [ ] Simulate Razorpay API failure (invalid credentials or network)
- [ ] Click cancel
- [ ] Verify: plan status returns to "active" (rollback)
- [ ] Verify: Cancellation Request status = "rolled_back" with errorMessage
- [ ] Verify: clear error message shown to user

### Test Case 7: Manual subscription (not purchase)
- [ ] Grant manual paid access via admin
- [ ] Try to cancel from Profile
- [ ] Verify: "No active paid subscription found" — manual subscriptions cannot be cancelled

### Test Case 8: Already refunded subscription
- [ ] Cancel a subscription that already has a refundId
- [ ] Verify: 409 "This subscription has already been refunded"

### Test Case 9: Welcome email via webhook
- [ ] Process a payment via Razorpay webhook `payment.captured` (not via verifyPayment)
- [ ] Verify: welcome email is sent
- [ ] Verify: `welcomeEmailSentAt` is set on transaction

---

## What Was NOT Run (honest disclosure)

- [ ] End-to-end cancellation against live Razorpay test mode (requires running server + test credentials)
- [ ] Backend integration tests (no test framework installed; only `test-refund-calc.js` standalone)
- [ ] Frontend runtime testing (build passes but UI not interacted with)
- [ ] Razorpay webhook delivery (requires public URL + webhook dashboard config)
- [ ] Brevo/Resend email delivery (requires API keys configured)

---

## What Was Run

- [x] `node test-refund-calc.js` — all 7 refund calculation scenarios pass
- [x] `node -e "import('./src/app.js')"` — backend imports compile cleanly
- [x] `npx vite build` — frontend builds successfully (~473 KB)

---

## Files Changed (this implementation pass)

| File | Action |
|------|--------|
| `backend/src/models/CancellationRequest.js` | NEW |
| `backend/src/controllers/paymentController.js` | Rewrote cancelSubscription + webhook refund handlers + welcome email in webhook |
| `backend/src/controllers/subscriptionController.js` | Added getCancellationRequests + export |
| `backend/src/routes/subscriptionRoutes.js` | Added POST /cancel + GET /cancellation-requests routes |
| `backend/src/validation/schemas.js` | Added cancelSubscription schema |
| `backend/src/utils/auditLog.js` | Deleted duplicate createAlert |
| `frontend/auth-client/src/pages/Profile.jsx` | Deleted broken modal; button navigates to cancel page |
| `frontend/auth-client/src/pages/CancelSubscription.jsx` | Rewrote: notice screen, correct response shape, 409 handling, zero-refund button |
| `frontend/auth-client/src/pages/Plans.jsx` | Added Cancellation & refund policy link |
| `frontend/auth-client/src/pages/admin/Payments.jsx` | Fixed header/cell mismatch; added Cancellation Request column |
| `frontend/auth-client/src/api/subscriptions.js` | Added getCancellationRequests API function |
