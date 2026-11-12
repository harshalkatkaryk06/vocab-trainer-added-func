import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      if (response.data.success) {
        setDone(true);
      } else {
        setError(response.data.message || "Could not reset your password.");
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vt-auth-page vt-recovery-page">
      <header className="vt-auth-header">
        <Link to="/" className="vt-brand" aria-label="VocabTrainer sign in">
          <span className="vt-brand-mark" aria-hidden="true">V</span>
          <span>VocabTrainer</span>
        </Link>
      </header>
      <main className="vt-recovery-main">
        <section className="vt-recovery-panel">
          {!token ? (
            <div className="vt-recovery-success">
              <p className="vt-eyebrow">Account recovery</p>
              <h1>Invalid reset link</h1>
              <p>This link is missing or malformed. Request a new one to continue.</p>
              <Link to="/forgot-password" className="vt-button-primary">Request a new link</Link>
            </div>
          ) : done ? (
            <div className="vt-recovery-success">
              <span className="vt-recovery-icon" aria-hidden="true">✓</span>
              <p className="vt-eyebrow">Password updated</p>
              <h1>You’re all set.</h1>
              <p>Your password has been reset and all sessions were signed out. Sign in with your new password.</p>
              <Link to="/" className="vt-button-primary">Go to sign in</Link>
            </div>
          ) : (
            <>
              <p className="vt-eyebrow">Account recovery</p>
              <h1>Choose a new password</h1>
              <p className="vt-recovery-description">Use at least 8 characters and choose a password you don’t use elsewhere.</p>
              <form className="vt-recovery-form" onSubmit={submit}>
                <label className="vt-field">
                  <span>New password</span>
                  <input
                    className="vt-input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                <label className="vt-field">
                  <span>Confirm new password</span>
                  <input
                    className="vt-input"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                  />
                </label>
                {error && <p className="vt-form-error" role="alert">{error}</p>}
                <button className="vt-button-primary" type="submit" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
              <Link to="/" className="vt-recovery-back">← Back to sign in</Link>
            </>
          )}
        </section>
      </main>
      <footer className="vt-auth-footer">
        <span>VocabTrainer</span>
        <span>Make every word count.</span>
      </footer>
    </div>
  );
}
