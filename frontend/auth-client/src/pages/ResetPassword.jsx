import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PAGE = "flex min-h-screen items-center justify-center px-6 bg-[#08080f] text-[#ededf2] [background-image:radial-gradient(900px_500px_at_50%_-8%,rgba(124,108,255,0.16),transparent_60%),radial-gradient(700px_500px_at_100%_100%,rgba(91,79,214,0.10),transparent_55%)]";
const INPUT = "w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await resetPassword(token, pw);
      if (res.data.success) setDone(true);
      else setError(res.data.message || "Could not reset password.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not reset password.");
    }
    setLoading(false);
  };

  const card = "w-full max-w-[420px] rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]";

  // No token in the URL
  if (!token) {
    return (
      <div className={PAGE}>
        <div className={`${card} text-center`}>
          <div className="mb-3 text-4xl">🔗</div>
          <h1 className={`${SERIF} m-0 mb-2 text-[26px] font-extrabold text-[#ededf2]`}>Invalid reset link</h1>
          <p className="m-0 text-[14px] leading-[1.6] text-[#9a9aae]">This link is missing or malformed. Request a new one.</p>
          <Link to="/forgot-password" className="mt-6 inline-block text-[13.5px] text-[#b6abff] no-underline hover:underline">
            Request a new link →
          </Link>
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');`}</style>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <div className={card}>
        {done ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h1 className={`${SERIF} m-0 mb-2 text-[28px] font-extrabold text-[#ededf2]`}>Password updated</h1>
            <p className="m-0 text-[14px] leading-[1.6] text-[#9a9aae]">
              Your password has been reset and all sessions were signed out. You can log in with your new password now.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-[12px] bg-[#7c6cff] px-6 py-3 text-sm font-semibold text-white no-underline shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className={`${SERIF} m-0 mb-2 text-[30px] font-extrabold text-[#ededf2]`}>Set a new password</h1>
            <p className="m-0 mb-6 text-[14px] leading-[1.6] text-[#9a9aae]">Choose a strong password you don't use elsewhere.</p>

            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">New password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="min. 8 characters"
              className={INPUT}
            />

            <label className="mb-1.5 mt-4 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="re-enter password"
              className={INPUT}
            />

            {error && (
              <div className="mt-3 rounded-[10px] border-[0.5px] border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] px-3.5 py-2.5 text-[13px] text-[#ff7b7b]">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className={`mt-5 w-full rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px ${loading ? "opacity-70" : "cursor-pointer"}`}
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>

            <div className="mt-5 text-center">
              <Link to="/" className="text-[13px] text-[#6a6a7c] no-underline transition-colors hover:text-[#b6abff]">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');`}</style>
    </div>
  );
}