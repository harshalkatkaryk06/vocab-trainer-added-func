import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PAGE = "flex min-h-screen items-center justify-center px-6 bg-[#08080f] text-[#ededf2] [background-image:radial-gradient(900px_500px_at_50%_-8%,rgba(124,108,255,0.16),transparent_60%),radial-gradient(700px_500px_at_100%_100%,rgba(91,79,214,0.10),transparent_55%)]";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await forgotPassword(email.trim());
      if (res.data.success) setSent(true);
      else setError(res.data.message || "Something went wrong");
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className={PAGE}>
      <div className="w-full max-w-[420px] rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
        {sent ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">📬</div>
            <h1 className={`${SERIF} m-0 mb-2 text-[28px] font-extrabold text-[#ededf2]`}>Check your inbox</h1>
            <p className="m-0 text-[14px] leading-[1.6] text-[#9a9aae]">
              If an account exists for <span className="text-[#b6abff]">{email}</span>, a reset link is on its way. It expires in 30 minutes.
            </p>
            <Link to="/" className="mt-6 inline-block text-[13.5px] text-[#b6abff] no-underline hover:underline">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className={`${SERIF} m-0 mb-2 text-[30px] font-extrabold text-[#ededf2]`}>Reset your password</h1>
            <p className="m-0 mb-6 text-[14px] leading-[1.6] text-[#9a9aae]">
              Enter your email and we'll send you a link to reset it.
            </p>

            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@example.com"
              className="w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]"
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
              {loading ? "Sending…" : "Send reset link"}
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