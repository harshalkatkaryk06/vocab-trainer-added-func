import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const adminSections = [
  {
    label: "Workspace",
    items: [
      { path: "/admin/overview", label: "Overview" },
      { path: "/admin/users", label: "Users" },
      { path: "/admin/admins", label: "Administrators" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { path: "/admin/payments", label: "Payments" },
      { path: "/admin/subscriptions", label: "Subscriptions" },
      { path: "/admin/plans", label: "Plans" },
      { path: "/admin/cancellation-requests", label: "Cancellation requests", superAdminOnly: true },
    ],
  },
  {
    label: "Trust & safety",
    items: [
      { path: "/admin/audit-logs", label: "Audit logs" },
      { path: "/admin/security-events", label: "Security events" },
      { path: "/admin/alerts/security", label: "Security alerts" },
      { path: "/admin/alerts/authentication", label: "Authentication alerts" },
      { path: "/admin/alerts/ai-usage", label: "AI usage alerts" },
      { path: "/admin/alerts/system", label: "System alerts" },
      { path: "/admin/alerts/history", label: "Alert history" },
    ],
  },
  {
    label: "Platform",
    items: [
      { path: "/admin/system-health", label: "System health" },
      { path: "/admin/words", label: "Vocabulary tools" },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = useMemo(
    () => adminSections.flatMap((section) => section.items)
      .find((item) => item.path === location.pathname)?.label || "Administration",
    [location.pathname]
  );

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="vt-admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="vt-admin-backdrop"
          aria-label="Close admin navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`vt-admin-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="vt-admin-brand-block">
          <Link to="/" className="vt-brand" aria-label="VocabTrainer home">
            <span className="vt-brand-mark" aria-hidden="true">V</span>
            <span>VocabTrainer</span>
          </Link>
          <span className="vt-admin-workspace-label">Admin workspace</span>
        </div>

        <nav className="vt-admin-nav" aria-label="Administration">
          {adminSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.superAdminOnly || user?.role === "super_admin"
            );
            if (!visibleItems.length) return null;
            return (
              <section className="vt-admin-nav-group" key={section.label}>
                <h2>{section.label}</h2>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin/overview"}
                    className={({ isActive }) => `vt-admin-nav-link${isActive ? " is-active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </section>
            );
          })}
        </nav>

        <div className="vt-admin-sidebar-footer">
          <div className="vt-admin-user">
            <span className="vt-account-avatar" aria-hidden="true">
              {(user?.username || "?").charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>@{user?.username}</strong>
              <small>{user?.role?.replace("_", " ")}</small>
            </span>
          </div>
          <Link to="/" className="vt-admin-back-link">← Back to app</Link>
          <button type="button" className="vt-admin-signout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="vt-admin-topbar">
          <button
            type="button"
            className="vt-admin-menu-toggle"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
          <div>
            <span className="vt-admin-breadcrumb">Administration</span>
            <span className="vt-admin-current-page">{currentPage}</span>
          </div>
          <span className="vt-admin-role-badge">Admin workspace</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
