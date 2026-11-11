# VocabTrainer Frontend

React + Vite + Tailwind CSS frontend for the VocabTrainer vocabulary learning application.

## Tech Stack

- **React 19** with React Router DOM v7
- **Vite** build tool
- **Tailwind CSS v4**
- **Axios** for API requests
- **@react-oauth/google** for Google OAuth login

## Project Structure

```
src/
  api/           API client modules (auth, words, quiz, admin, subscriptions, alerts)
  components/    Reusable UI components (Navbar, AdminLayout, ErrorBoundary, ...)
  context/       AuthContext (authentication state management)
  pages/         Page components (Auth, Search, Library, Quiz, Profile, Plans, Admin sections)
  App.jsx        Application router
  main.jsx       Entry point with AuthProvider and GoogleOAuthProvider
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |

## Environment Variables

Create a `.env` file in this directory:

```
VITE_API_URL=http://localhost:4000/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## Backend Integration

The frontend connects to the VocabTrainer backend API. The backend serves the built frontend statically in production, so both deploy together.

## Features

- User registration/login (email + Google OAuth)
- AI-powered word search with spelling correction
- Personal word library (save, edit, delete)
- AI-generated vocabulary quizzes
- Subscription plans (Free / Pro)
- AI usage tracking with daily limits
- Admin dashboard (user management, subscription management, payments, monitoring)
- Security events and alert monitoring
- Audit logging

## Build Output

Run `npm run build` to generate production assets in `dist/`. These are served by the backend via `express.static`.
