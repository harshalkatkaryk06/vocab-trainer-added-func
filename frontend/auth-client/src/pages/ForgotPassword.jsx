import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await forgotPassword(email.trim());
      if (response.data.success) {
        setSent(true);
      } else {
        setError(response.data.message || "Could not send a reset link.");
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not send a reset link.");
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
          {sent ? (
            <div className="vt-recovery-success">
              <span className="vt-recovery-icon" aria-hidden="true">✓</span>
              <p className="vt-eyebrow">Email sent</p>
              <h1>Check your inbox.</h1>
              <p>
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
                It expires in 30 minutes.
              </p>
              <Link to="/" className="vt-button-primary">Back to sign in</Link>
            </div>
          ) : (
            <>
              <p className="vt-eyebrow">Account recovery</p>
              <h1>Reset your password</h1>
              <p className="vt-recovery-description">
                Enter the email address on your account and we’ll send you a reset link.
              </p>
              <form className="vt-recovery-form" onSubmit={submit}>
                <label className="vt-field">
                  <span>Email address</span>
                  <input
                    className="vt-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                {error && <p className="vt-form-error" role="alert">{error}</p>}
                <button className="vt-button-primary" type="submit" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
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
