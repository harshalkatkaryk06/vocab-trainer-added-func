import { useState, useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SERIF = "font-sans";

export default function Navbar() {
  const { user, logout } = useAuth();

  const [profileMenu, setProfileMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const profileRef = useRef(null);
  const mobileRef = useRef(null);

  const linkClass = ({ isActive }) =>
    `cursor-pointer border-b-2 bg-transparent px-0.5 py-1 text-[14px] lg:text-[14.5px] no-underline transition-colors ${
      isActive
        ? "border-[#7c6cff] font-semibold text-[#ededf2]"
        : "border-transparent font-medium text-[#6a6a7c] hover:text-[#b6abff]"
    }`;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target)
      ) {
        setProfileMenu(false);
      }

      if (
        mobileRef.current &&
        !mobileRef.current.contains(e.target)
      ) {
        setMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setMobileMenu(false);
    };

    window.addEventListener("scroll", handleScroll);

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  return (
    <>
      <header
        className="vt-navbar
          sticky top-0 z-50
          h-16
          border-b border-white/[0.07]
          bg-[rgba(8,8,15,0.72)]
          backdrop-blur-[14px]
        "
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/"
            aria-label="VocabTrainer home"
            className="
              rounded-[9px]
              border border-[rgba(124,108,255,0.5)]
              px-3 py-1.5
              no-underline
              shadow-[0_0_0_1px_rgba(124,108,255,0.06),0_6px_18px_-10px_rgba(124,108,255,0.6)]
              transition-transform
              hover:-translate-y-px
            "
          >
            <span
              className={`${SERIF} text-lg sm:text-xl font-bold tracking-[0.01em] text-[#b6abff]`}
            >
              VocabTrainer
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 md:flex gap-6 lg:gap-8">
            <NavLink to="/" end className={linkClass}>
              Search
            </NavLink>

            <NavLink to="/library" className={linkClass}>
              Library
            </NavLink>

            <NavLink to="/quiz" className={linkClass}>
              Quiz
            </NavLink>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <NavLink to="/admin/words" className={linkClass}>
                Add Words
              </NavLink>
            )}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <NavLink to="/admin/overview" className={linkClass}>
                Admin Dashboard
              </NavLink>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger */}
            <button
              onClick={() =>
                setMobileMenu((prev) => !prev)
              }
              className="
                md:hidden
                flex h-11 w-11 items-center justify-center
                rounded-xl
                border border-white/[0.07]
                text-[#9a9aae]
                transition-all
                hover:border-[rgba(124,108,255,0.35)]
                hover:text-[#b6abff]
              "
              aria-label="Toggle menu"
              aria-expanded={mobileMenu}
              aria-controls="primary-mobile-navigation"
            >
              {mobileMenu ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </svg>
              )}
            </button>

            {/* Profile */}
            <div
              ref={profileRef}
              className="relative"
            >
              <button
                onClick={() =>
                  setProfileMenu((m) => !m)
                }
                aria-label="Account"
                aria-expanded={profileMenu}
                className={`
                  flex h-11 w-11 md:h-[38px] md:w-[38px]
                  items-center justify-center
                  rounded-full
                  border border-white/[0.07]
                  text-[#9a9aae]
                  transition-all
                  ${
                    profileMenu
                      ? "bg-[rgba(124,108,255,0.12)]"
                      : "bg-transparent"
                  }
                `}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </button>

              {profileMenu && (
                <div
                  className="
                    absolute right-0 top-12 z-50
                    min-w-[190px]
                    rounded-xl
                    border border-white/[0.07]
                    bg-[#0f0f18]
                    p-1.5
                    shadow-[0_18px_44px_-18px_rgba(0,0,0,0.8)]
                    animate-[cardIn_0.18s_ease]
                  "
                >
                  <div className="mb-1 border-b border-white/[0.05] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[#6a6a7c]">
                      Signed in as
                    </div>

                    <div className="text-sm font-semibold text-[#ededf2]">
                      @{user?.username}
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() =>
                      setProfileMenu(false)
                    }
                    className="
                      block w-full
                      rounded-lg
                      px-3 py-2.5
                      text-[13.5px]
                      text-[#b6abff]
                      no-underline
                      transition-colors
                      hover:bg-[rgba(124,108,255,0.12)]
                    "
                  >
                    View profile
                  </Link>

                  <Link
                      to="/plans"
                      onClick={() =>
                        setProfileMenu(false)
                      }
                      className="
                        block w-full
                        rounded-lg
                        px-3 py-2.5
                        text-[13.5px]
                        text-[#b6abff]
                        no-underline
                        transition-colors
                        hover:bg-[rgba(124,108,255,0.12)]
                      "
                    >
                      Plans & subscription
                    </Link>

                  <button
                    onClick={() => {
                      setProfileMenu(false);
                      logout();
                    }}
                    className="
                      w-full
                      rounded-lg
                      px-3 py-2.5
                      text-left
                      text-[13.5px]
                      text-[#9a9aae]
                      transition-colors
                      hover:bg-[rgba(255,123,123,0.1)]
                      hover:text-[#ff7b7b]
                    "
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          ref={mobileRef}
          id="primary-mobile-navigation"
          className={`
            md:hidden
            overflow-hidden
            transition-all duration-300
            ${
              mobileMenu
                ? "max-h-72 border-t border-white/[0.05]"
                : "max-h-0"
            }
          `}
        >
          <nav className="bg-[#0f0f18] px-4 py-4">
            <div className="flex flex-col gap-4">
              <NavLink
                to="/"
                end
                onClick={() =>
                  setMobileMenu(false)
                }
                className={linkClass}
              >
                Search
              </NavLink>

              <NavLink
                to="/library"
                onClick={() =>
                  setMobileMenu(false)
                }
                className={linkClass}
              >
                Library
              </NavLink>

              <NavLink
                to="/quiz"
                onClick={() =>
                  setMobileMenu(false)
                }
                className={linkClass}
              >
                Quiz
              </NavLink>

              {(user?.role === "admin" || user?.role === "super_admin") && (
              <NavLink
                to="/admin/words"
                onClick={() => setMobileMenu(false)}
                className={linkClass}
              >
                Add Words
              </NavLink>
            )}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <NavLink
                to="/admin/overview"
                onClick={() => setMobileMenu(false)}
                className={linkClass}
              >
                Admin Dashboard
              </NavLink>
            )}
            </div>
          </nav>
        </div>

        <style>{`
          @keyframes cardIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: none;
            }
          }
        `}</style>
      </header>
    </>
  );
}
