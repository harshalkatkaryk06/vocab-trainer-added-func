import { useState, useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const adminSections = [
  { path: "/admin/overview", label: "Overview", icon: "📊" },
  { path: "/admin/users", label: "User Management", icon: "👥" },
  { path: "/admin/admins", label: "Admin Management", icon: "🛡️" },
  { path: "/admin/audit-logs", label: "Audit Logs", icon: "📋" },
  { path: "/admin/security-events", label: "Security Events", icon: "🚨" },
  { path: "/admin/payments", label: "Payments", icon: "💳" },
  { path: "/admin/cancellation-requests", label: "Cancellation Requests", icon: "↩️", superAdminOnly: true },
  { path: "/admin/alerts/security", label: "Monitoring: Security", icon: "🛡️" },
  { path: "/admin/alerts/system", label: "Monitoring: System", icon: "🖥️" },
  { path: "/admin/alerts/authentication", label: "Monitoring: Auth", icon: "🔐" },
  { path: "/admin/alerts/ai-usage", label: "Monitoring: AI Usage", icon: "🤖" },
  { path: "/admin/alerts/history", label: "Alert History", icon: "📜" },
  { path: "/admin/plans", label: "Plans", icon: "📋" },
  { path: "/admin/subscriptions", label: "Subscriptions", icon: "💳" },
  { path: "/admin/system-health", label: "System Health", icon: "⚡" },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="vt-admin-layout flex min-h-screen">
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 transform border-r border-white/[0.07] bg-[#0f0f18] transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 md:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="p-6 border-b border-white/[0.07]">
            <Link
              to="/"
              className="flex items-center gap-2 mb-2"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="font-sans text-lg font-bold tracking-[0.01em] text-[#b6abff]">
                VocabTrainer
              </span>
            </Link>
            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[#6a6a7c]">
              Admin Panel
            </p>
            <Link
              to="/"
              className="flex w-full items-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#0a0a12] px-4 py-2 text-xs font-medium text-[#9a9aae] transition-colors hover:bg-white/[0.04] hover:text-[#ededf2]"
            >
              ← Home
            </Link>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {adminSections
              .filter((section) => !section.superAdminOnly || user?.role === "super_admin")
              .map((section) => (
              <NavLink
                key={section.path}
                to={section.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#7c6cff]/10 text-[#b6abff]"
                      : "text-[#9a9aae] hover:bg-white/[0.03] hover:text-[#b6abff]"
                  }`
                }
              >
                <span>{section.icon}</span>
                {section.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/[0.07]">
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a7c]">
                Signed in as
              </div>
              <div className="text-sm font-semibold text-[#ededf2] truncate">
                @{user?.username}
              </div>
              <div className="mt-1 px-2 py-0.5 rounded border border-white/[0.07] text-[10px] text-[#9a9aae]">
                {user?.role?.replace("_", " ")}
              </div>
            </div>
            <button
              onClick={() => {
                setSidebarOpen(false);
                logout();
              }}
              className="w-full cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#9a9aae] transition-colors hover:bg-white/[0.05] hover:text-[#ff7b7b]"
            >
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="admin-content flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-white/[0.07] bg-[#08080f]/80 backdrop-blur px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden flex items-center gap-2 rounded-lg px-3 py-2 text-[#9a9aae] hover:bg-white/[0.05]"
            aria-label="Toggle sidebar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarOpen ? (
                <>
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </>
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
          <span className="text-sm font-medium text-[#9a9aae]">Administration</span>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.07] text-[10px] font-semibold text-[#b6abff]">
              Admin Panel
            </span>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
