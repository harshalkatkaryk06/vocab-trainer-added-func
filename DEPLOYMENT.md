# VocabTrainer Deployment Guide

This guide covers production deployment of the VocabTrainer application on Render, including environment configuration, database setup, and external service integration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment on Render](#backend-deployment-on-render)
4. [Frontend Deployment](#frontend-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Razorpay Configuration](#razorpay-configuration)
8. [Resend Configuration](#resend-configuration)
9. [Google OAuth Configuration](#google-oauth-configuration)
10. [Security Checklist](#security-checklist)
11. [Health Checks](#health-checks)

---

## Architecture Overview

VocabTrainer is a monorepo with:
- **Backend**: Node.js + Express + Mongoose (MongoDB Atlas), serving both the API and the built React frontend
- **Frontend**: React + Vite + Tailwind CSS, built to static assets served by the backend

The backend serves the frontend statically in production, so both deploy together as a single Render service.

---

## Prerequisites

- Render account connected to your Git repository
- MongoDB Atlas cluster (or any MongoDB instance)
- Resend account (for admin alert emails)
- Razorpay account (for payments — test mode for development)
- Google Cloud Console project (for Google OAuth)

---

## Backend Deployment on Render

### 1. Create the Render Service

1. Connect your GitHub repository to Render
2. Create a new **Web Service** from the `backend/` directory
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build` (if you add a build step) or `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select based on your needs

### 2. Set Environment Variables

In the Render dashboard, add all environment variables from `.env.example` with production values:

| Variable | Production Value |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render assigns automatically) |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Long random string (64+ hex chars) |
| `JWT_REFRESH_SECRET` | Long random string (64+ hex chars) |
| `ACCESS_TOKEN_EXPIRY` | `15m` |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `CLIENT_URL` | `https://your-frontend.onrender.com` or your custom domain |
| `PROD_CLIENT_URL` | Same as CLIENT_URL |
| `BREVO_API_KEY` | From Brevo dashboard |
| `BREVO_SENDER_EMAIL` | Verified sender email |
| `BREVO_SENDER_NAME` | `VocabTrainer` |
| `OPENAI_API_KEY` | From OpenAI dashboard |
| `UNLIMITED_EMAILS` | `harshalkatkar76@gmail.com` |
| `SUPER_ADMIN_EMAIL` | `harshalkatkar76@gmail.com` |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard (test mode) |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard (test mode) |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay webhook settings |
| `RESEND_API_KEY` | From Resend dashboard |
| `RESEND_SENDER_EMAIL` | Verified sender in Resend |
| `RESEND_SENDER_NAME` | `VocabTrainer Alerts` |
| `ALERT_EMAIL` | `harshalkatkar76@gmail.com` |

### 3. Deploy

1. Connect the repository
2. Add environment variables
3. Click **Create Web Service**
4. Render will automatically deploy on every push to the connected branch

---

## Frontend Deployment

The frontend is built and served statically by the backend. No separate frontend deployment is needed:

1. The build output (`frontend/auth-client/dist/`) is served by `express.static` in `backend/src/app.js`
2. Build the frontend locally or in CI: `cd frontend/auth-client && npm run build`
3. Commit the built assets or build them in your CI pipeline

**Note**: If you prefer separate frontend deployment (e.g., Vercel/Netlify), update `PROD_CLIENT_URL` and configure CORS accordingly.

---

## Environment Variables

### Required (must be set before first deploy)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `OPENAI_API_KEY` | OpenAI API key |
| `BREVO_API_KEY` | Brevo email API key |
| `BREVO_SENDER_EMAIL` | Brevo verified sender email |
| `CLIENT_URL` | Frontend URL for local/dev |
| `PROD_CLIENT_URL` | Production frontend URL |

### Optional (features disabled if missing)

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay payments (test mode) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification |
| `RESEND_API_KEY` / `RESEND_SENDER_EMAIL` / `RESEND_SENDER_NAME` | Admin alert emails |
| `ALERT_EMAIL` | Alert recipient email |
| `SUPER_ADMIN_EMAIL` | Initial Super Admin email |
| `UNLIMITED_EMAILS` | Emails exempt from AI limits |
| `ACCESS_TOKEN_EXPIRY` | Access token TTL (default: 15m) |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL (default: 7d) |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost (default: 12) |
| `NODE_ENV` | `development` or `production` |

---

## Database Setup

MongoDB Atlas is recommended:

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist Render's IP addresses (or allow 0.0.0.0/0 for simplicity)
4. Get the connection string: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/?appName=VocabTrainer`
5. Set as `MONGO_URI` in Render environment variables

**Database Initialization**: The application automatically seeds:
- Default `Free` plan (2 AI calls/day)
- Default `Pro` plan (unlimited AI calls, $9.99/30 days)
- Initial Super Admin (from `SUPER_ADMIN_EMAIL`)

No manual migration scripts are required.

---

## Razorpay Configuration

### Test Mode (Development)

1. Create a Razorpay account at [razorpay.com](https://razorpay.com)
2. Enable **Test Mode** in the dashboard
3. Go to **Settings → API Keys** and generate a key pair
4. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to environment variables
5. Set `NODE_ENV=development` (test mode is automatic)

### Webhook Configuration (Production)

1. In Razorpay Dashboard, go to **Settings → Webhooks**
2. Add webhook URL: `https://your-backend.onrender.com/api/v1/payments/webhook`
3. Select events: `payment.captured`, `order.paid`, `payment.failed`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`
5. Set `NODE_ENV=production` for production mode

---

## Resend Configuration

### Email Alerts

1. Create a Resend account at [resend.com](https://resend.com)
2. Verify your domain or use a test sender email
3. Create an API key from **API Keys**
4. Add to environment variables:
   - `RESEND_API_KEY` — your Resend API key
   - `RESEND_SENDER_EMAIL` — verified sender (e.g., `alerts@yourdomain.com`)
   - `RESEND_SENDER_NAME` — `VocabTrainer Alerts`
   - `ALERT_EMAIL` — `harshalkatkar76@gmail.com` (recipient)

### Sender Domain Setup

For production, verify your domain in Resend:
1. Go to **Domains** in Resend dashboard
2. Add your domain and add the DNS records provided
3. Wait for verification
4. Update `RESEND_SENDER_EMAIL` to use your domain

---

## Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Identity Services** API
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://your-frontend.onrender.com` (production)
7. Copy the Client ID to `GOOGLE_CLIENT_ID`
8. The frontend uses `@react-oauth/google` with this client ID

---

## Security Checklist

- [ ] `.env` is NOT committed to git (added to `.gitignore`)
- [ ] All secrets are set via Render environment variables, not in code
- [ ] `NODE_ENV=production` in production
- [ ] JWT secrets are long random strings (64+ hex chars)
- [ ] `PROD_CLIENT_URL` matches your production frontend URL
- [ ] CORS origin is restricted to your production frontend
- [ ] Refresh cookies are `httpOnly`, `Secure`, `SameSite`
- [ ] MongoDB connection uses SSL/TLS (Atlas default)
- [ ] Admin routes are protected by role-based middleware
- [ ] Super Admin email is configured via `SUPER_ADMIN_EMAIL`
- [ ] No secrets in frontend code or logs

---

## Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check — returns `{ success: true }` |
| `/api/v1/admin/system-health` | GET | Detailed system stats (admin only) |

Render can use `/api/health` for automatic health checks and auto-deploy verification.

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env  # Edit with your values
npm install
npm start

# Frontend
cd frontend/auth-client
npm install
npm run dev
```

The backend runs on port 4000, frontend on port 5173.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Ensure all environment variables are set in Render |
| MongoDB connection error | Verify `MONGO_URI` and IP whitelist |
| 401 on admin routes | Verify user has `admin` or `super_admin` role |
| Razorpay webhook fails | Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard |
| Resend emails not sent | Verify `RESEND_API_KEY` and sender email |
| Cookies not set | Verify `PROD_CLIENT_URL` matches your frontend domain |
| Frontend blank screen | Ensure `npm run build` was run and assets are committed |
