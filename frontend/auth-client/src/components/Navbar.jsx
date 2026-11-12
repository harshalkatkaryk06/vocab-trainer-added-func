import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const primaryLinks = [
  { to: "/", label: "Explore", end: true },
  { to: "/library", label: "My library" },
  { to: "/quiz", label: "Practice" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const linkClass = ({ isActive }) =>
    `vt-nav-link${isActive ? " is-active" : ""}`;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const initial = (user?.username || "?").charAt(0).toUpperCase();

  return (
    <header className="vt-navbar">
      <div className="vt-nav-inner" ref={menuRef}>
        <Link
          to="/"
          className="vt-brand"
          aria-label="VocabTrainer home"
          onClick={() => setMobileOpen(false)}
        >
          <span className="vt-brand-mark" aria-hidden="true">V</span>
          <span>VocabTrainer</span>
        </Link>

        <nav className="vt-primary-nav" aria-label="Main navigation">
          {primaryLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin/overview" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="vt-nav-actions">
          <button
            type="button"
            className="vt-account-trigger"
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className="vt-account-avatar" aria-hidden="true">{initial}</span>
            <span className="vt-account-name">@{user?.username}</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="vt-mobile-menu-toggle"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="vt-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>

        {accountOpen && (
          <div className="vt-account-menu" role="menu">
            <div className="vt-account-menu-user">
              <span className="vt-eyebrow">Signed in as</span>
              <strong>@{user?.username}</strong>
            </div>
            <Link to="/profile" role="menuitem" onClick={() => setAccountOpen(false)}>
              Profile &amp; progress
            </Link>
            <Link to="/plans" role="menuitem" onClick={() => setAccountOpen(false)}>
              Plan &amp; billing
            </Link>
            {isAdmin && (
              <Link to="/admin/words" role="menuitem" onClick={() => setAccountOpen(false)}>
                Manage vocabulary
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAccountOpen(false);
                logout();
              }}
            >
              Sign out
            </button>
          </div>
        )}

        {mobileOpen && (
          <nav id="vt-mobile-navigation" className="vt-mobile-nav" aria-label="Mobile navigation">
            {primaryLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/profile" className={linkClass} onClick={() => setMobileOpen(false)}>
              Profile
            </NavLink>
            <NavLink to="/plans" className={linkClass} onClick={() => setMobileOpen(false)}>
              Plans
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/overview" className={linkClass} onClick={() => setMobileOpen(false)}>
                Admin
              </NavLink>
            )}
            <button
              type="button"
              className="vt-mobile-signout"
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
