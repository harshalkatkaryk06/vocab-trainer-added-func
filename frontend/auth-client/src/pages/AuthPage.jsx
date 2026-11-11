import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORD_FACTS = [
  { label: "Words in English", value: "170,000+" },
  { label: "Words Shakespeare invented", value: "1,700+" },
  { label: "New words added yearly", value: "~1,000" },
  { label: "Avg adult vocabulary", value: "20,000–35,000" },
];

function LetterGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const items = [];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("div");
      el.className =
        "absolute pointer-events-none font-['Literata',serif] text-white opacity-[0.05] transition-all duration-1000 ease-in-out";
      el.textContent = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
      const size = Math.floor(Math.random() * 40) + 20;
      el.style.fontSize = `${size}px`;
      let x = Math.random() * 100, y = Math.random() * 100;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      grid.appendChild(el);
      const iv = setInterval(() => {
        x += (Math.random() - 0.5) * 5;
        y += (Math.random() - 0.5) * 5;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.opacity = String((Math.random() * 0.08) + 0.02);
      }, 3000);
      items.push({ el, iv });
    }
    return () => items.forEach(({ el, iv }) => { clearInterval(iv); el.remove(); });
  }, []);
  return <div className="absolute inset-0 z-0 pointer-events-none" ref={ref} />;
}

function DidYouKnow() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setIdx((i) => (i + 1) % WORD_FACTS.length); setFading(false); }, 400);
    }, 5000);
    return () => clearInterval(t);
  }, []);
  const { value, label } = WORD_FACTS[idx];
  return (
    <div className="relative rounded-xl border border-white/10 bg-[rgba(26,30,38,0.6)] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-[20px] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-xl before:bg-[#9889ff] before:content-['']">
      <span className="mb-4 block text-xs font-semibold uppercase tracking-[0.12em] text-[#b2a8ff]">
        Did You Know?
      </span>
      <div className={`min-h-[60px] font-['Georgia',serif] text-[15px] leading-[1.65] text-[#c7c4d8] transition-opacity duration-[400ms] ${fading ? "opacity-0" : ""}`}>
        <span className="text-[18px] font-bold text-[#b2a8ff]">{value}</span> {label.toLowerCase()}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
  setError(""); setLoading(true);
  try {
    if (mode === "login") {
      await login(form.email, form.password, remember);
    } else {
      // Check username length on the client before hitting the API —
      // mirrors the backend's minlength: 3 rule on the User schema.
      const trimmedUsername = form.username.trim();
      if (trimmedUsername.length < 3) {
        setError("Username must be at least 3 characters");
        setLoading(false);
        return;
      }

      const d = await register(form.username, form.email, form.password);
      if (d.success) setMode("login");
      else setError(d.message || "Registration failed");
    }
  } catch (err) {
    setError(err?.response?.data?.message || "Something went wrong");
  }
  setLoading(false);
};

  const handleGoogle = async (cred) => {
    setError(""); setLoading(true);
    try {
      await loginWithGoogle(cred.credential);
    } catch (err) {
      setError(err?.response?.data?.message || "Google login failed");
    }
    setLoading(false);
  };

  const switchMode = (m) => { setMode(m); setError(""); };

  const tabBase = "flex-1 cursor-pointer rounded-lg border-none p-2.5 font-['Hanken_Grotesk',sans-serif] text-sm font-medium outline-none transition-all";

  return (
    <>
      <div className="vt-auth-page relative flex min-h-screen overflow-x-hidden bg-[#0f1117] font-sans text-[#e4e1ee]">
        {/* Orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 z-0 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#c4c0ff] opacity-[0.18] blur-[100px]" />
        <div className="pointer-events-none absolute bottom-1/4 -right-24 z-0 h-64 w-64 sm:h-80 sm:w-80 rounded-full bg-[#8781ff] opacity-[0.14] blur-[100px]" />

        {/* Left panel */}
        <div
  className="
  relative hidden lg:flex
  flex-1 flex-col justify-center
  overflow-hidden
  border-r border-white/5
  bg-[#0e0d16]
  px-10 xl:px-16 2xl:px-24
"
>
          <LetterGrid />
          <div className="relative z-[1] max-w-[520px]">
            <div className="mb-12 flex items-center gap-3">
              <span className="rounded-md border-2 border-[#8781ff] px-2 py-0.5 font-['Literata',serif] text-xl font-bold text-[#8781ff]">VT</span>
              <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#c4c0ff]">VocabTrainer</span>
            </div>
            <h1
  className="
  mb-7
  font-['Literata',serif]
  text-[38px]
  xl:text-[52px]
  2xl:text-[60px]
  font-bold
  leading-[1.15]
  tracking-[-0.02em]
  text-[#e4e1ee]
"
>
              Expand your<br /><em className="italic text-[#c4c0ff]">lexical universe.</em>
            </h1>
            <p className="mb-12 max-w-[360px] text-[15px] leading-[1.7] text-white/50">
              Search any word, get AI-powered definitions, pronunciations, and examples.
              Build your personal library one word at a time.
            </p>
            <DidYouKnow />
          </div>
        </div>

        {/* Right panel */}
        <div
  className="
  z-20
  flex flex-1
  items-center justify-center
  px-4 py-8
  sm:px-6
  md:px-10 md:py-12
"
>
         <div className="w-full max-w-[520px]">

            <div className="mb-8 text-center lg:hidden">
              <span className="rounded-md border-2 border-[#8781ff] px-2 py-0.5 font-['Literata',serif] text-xl font-bold text-[#8781ff]">VT</span>
              <p className="mt-3 font-['Literata',serif] text-2xl text-[#e4e1ee]">VocabTrainer</p>
            </div>

            <div
  className="
  rounded-2xl
  border border-white/10
  bg-[rgba(26,30,38,0.6)]
  p-5
  sm:p-7
  md:p-10
  shadow-[0_0_50px_rgba(108,99,255,0.1)]
  backdrop-blur-[20px]
"
>

              {/* Tab switcher */}
              <div className="mb-8 flex gap-1 rounded-[10px] bg-[#1b1b24] p-1">
                {["login", "register"].map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`${tabBase} ${
                      mode === m
                        ? "bg-[#1f1f28] text-[#e4e1ee] shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                        : "bg-transparent text-[#918fa1]"
                    }`}
                  >
                    {m === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <h2
  className="
  mb-2
  font-['Literata',serif]
  text-[1.65rem]
  sm:text-[1.9rem]
  md:text-[2rem]
  font-semibold
  text-[#e4e1ee]
"
>
                {mode === "login" ? "Welcome Back" : "Join the Journey"}
              </h2>
              <p
  className="
  mb-8
  text-sm
  sm:text-base
  leading-[1.7]
  text-[#c7c4d8]
"
>
                {mode === "login"
                  ? "Log in to resume your journey through the cosmos of language."
                  : "Start building your personal lexical library today."}
              </p>

              {/* Google button — centered, fills the card width */}
              <div className="flex w-full justify-center overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => setError("Google sign-in failed")}
                  theme="filled_black"
                  size="large"
                  shape="pill"
                  width="240"
                  text={mode === "login" ? "signin_with" : "signup_with"}
                />
              </div>

              {/* Divider — equal spacing above and below */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-xs font-medium tracking-[0.08em] text-[#918fa1]">OR EMAIL</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              {mode === "register" && (
  <div className="mb-4">
    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-[#c7c4d8]">Username</label>
    <input
      value={form.username}
      onChange={set("username")}
      placeholder="wordsmith42"
      className="w-full border-b border-[#464555] bg-transparent py-3 font-['Hanken_Grotesk',sans-serif] text-base text-[#e4e1ee] outline-none transition-colors placeholder:text-[#464555] hover:border-[#e4e1ee] focus:border-[#c4c0ff]"
    />
    <p className="mt-1.5 text-xs text-[#918fa1]">
      Must be at least 3 characters
    </p>
  </div>
)}

              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-[#c7c4d8]">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="w-full border-b border-[#464555] bg-transparent py-3 font-['Hanken_Grotesk',sans-serif] text-base text-[#e4e1ee] outline-none transition-colors placeholder:text-[#464555] hover:border-[#e4e1ee] focus:border-[#c4c0ff]"
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-[#c7c4d8]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="min. 8 characters"
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full border-b border-[#464555] bg-transparent py-3 pr-14 font-sans text-base text-[#e4e1ee] outline-none transition-colors placeholder:text-[#464555] hover:border-[#e4e1ee] focus:border-[#c4c0ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-0 top-1/2 -translate-y-1/2 border-0 bg-transparent px-2 py-1 text-xs text-[#a0aab8] hover:text-[#b2a8ff]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <div className="my-5 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#c7c4d8]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded accent-[#c4c0ff]"
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-xs text-[#c4c0ff] no-underline transition-colors hover:text-[#e3dfff]">Forgot Password?</Link>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.2)] px-3.5 py-2.5 text-[13px] text-[#ffdad6]">
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={loading}
                className="
mt-2
w-full
cursor-pointer
rounded-xl
border-none
bg-[#c4c0ff]
py-3.5
sm:py-4
px-4
text-sm
font-semibold
tracking-[0.04em]
text-[#2000a4]
shadow-[0_4px_20px_rgba(108,99,255,0.3)]
transition-all
hover:bg-[#8781ff]
hover:shadow-[0_4px_30px_rgba(108,99,255,0.5)]
active:scale-[0.97]
disabled:cursor-not-allowed
disabled:opacity-60
"
              >
                {loading ? "Please wait…" : mode === "login" ? "Log In to System" : "Create Account →"}
              </button>

              <div className="mt-10 text-center text-base text-[#c7c4d8]">
                {mode === "login" ? (
                  <>New explorer?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); switchMode("register"); }} className="font-bold text-[#b2a8ff] no-underline [text-underline-offset:4px] hover:underline hover:decoration-2">Create Account</a>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); switchMode("login"); }} className="font-bold text-[#b2a8ff] no-underline [text-underline-offset:4px] hover:underline hover:decoration-2">Sign In</a>
                  </>
                )}
              </div>

            </div>

            <div
  className="
  mt-8
  px-2 sm:px-6
  text-center
  text-[11px]
  sm:text-xs
  leading-[1.7]
  text-[#918fa1]
"
>
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-[#918fa1] no-underline transition-colors hover:text-[#e4e1ee]">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="text-[#918fa1] no-underline transition-colors hover:text-[#e4e1ee]">Privacy Policy</Link>.
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
