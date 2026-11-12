import { useState } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/useTheme";

const STEPS = [
  ["01", "Look it up", "Get a clear definition and examples in context."],
  ["02", "Keep what matters", "Save useful words to your personal library."],
  ["03", "Make it stick", "Return to your saved words with focused quizzes."],
];

export default function AuthPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password, remember);
      } else {
        const username = form.username.trim();
        if (username.length < 3) {
          setError("Username must be at least 3 characters.");
          return;
        }
        const result = await register(username, form.email.trim(), form.password);
        if (result.success) {
          setMode("login");
          setForm((current) => ({ ...current, password: "" }));
        } else {
          setError(result.message || "Registration failed.");
        }
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in did not return a credential. Please try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <div className="vt-auth-page">
      <header className="vt-auth-header">
        <Link to="/" className="vt-brand" aria-label="VocabTrainer sign in">
          <span className="vt-brand-mark" aria-hidden="true">V</span>
          <span>VocabTrainer</span>
        </Link>
        <span className="vt-auth-header-note">A little more precise, every day.</span>
      </header>

      <div className="vt-auth-layout">
        <section className="vt-auth-intro" aria-labelledby="auth-intro-title">
          <div className="vt-auth-intro-copy">
            <p className="vt-eyebrow">A better relationship with words</p>
            <h1 id="auth-intro-title">
              Build a vocabulary
              <span> that stays with you.</span>
            </h1>
            <p className="vt-auth-lede">
              Look up unfamiliar words, keep the ones worth remembering, and
              bring them back through practice.
            </p>
          </div>
          <ol className="vt-auth-steps">
            {STEPS.map(([number, title, description]) => (
              <li key={number}>
                <span className="vt-auth-step-number">{number}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </li>
            ))}
          </ol>
          <p className="vt-auth-quote">
            Collect a word. Return to it. Make it yours.
          </p>
        </section>

        <section className="vt-auth-panel" aria-labelledby="auth-title">
          <div className="vt-auth-panel-heading">
            <p className="vt-eyebrow">{mode === "login" ? "Welcome back" : "Get started"}</p>
            <h2 id="auth-title">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h2>
            <p>
              {mode === "login"
                ? "Pick up where your curiosity left off."
                : "Your personal word library starts here."}
            </p>
          </div>

          <div className="vt-auth-switch" role="tablist" aria-label="Account action">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "is-active" : ""}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "is-active" : ""}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <div className="vt-google-login">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError("Google sign-in failed. Please try again.")}
              theme={theme === "dark" ? "filled_black" : "outline"}
              size="large"
              shape="pill"
              text={mode === "login" ? "signin_with" : "signup_with"}
              width="320"
            />
          </div>

          <div className="vt-auth-divider"><span>or continue with email</span></div>

          <form onSubmit={submit} className="vt-auth-form">
            {mode === "register" && (
              <label className="vt-field">
                <span>Name</span>
                <input
                  autoComplete="username"
                  className="vt-input"
                  value={form.username}
                  onChange={setField("username")}
                  placeholder="How should we address you?"
                  required
                  minLength={3}
                />
              </label>
            )}

            <label className="vt-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                className="vt-input"
                value={form.email}
                onChange={setField("email")}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="vt-field">
              <span>Password</span>
              <span className="vt-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="vt-input"
                  value={form.password}
                  onChange={setField("password")}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="vt-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            {mode === "login" && (
              <div className="vt-auth-options">
                <label className="vt-checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
                <Link to="/forgot-password" className="vt-link">Forgot password?</Link>
              </div>
            )}

            {error && <p className="vt-form-error" role="alert">{error}</p>}

            <button className="vt-button-primary vt-auth-submit" type="submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="vt-auth-legal">
            By continuing, you agree to our <Link to="/terms" className="vt-link">Terms</Link> and{" "}
            <Link to="/privacy" className="vt-link">Privacy Policy</Link>.
          </p>
        </section>
      </div>

      <footer className="vt-auth-footer">
        <span>VocabTrainer</span>
        <span>Make every word count.</span>
      </footer>
    </div>
  );
}
