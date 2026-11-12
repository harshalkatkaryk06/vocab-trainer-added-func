import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  useAdminUsers,
  useAdmins,
  useAuditLogs,
  useSecurityEvents,
  useAdminPayments,
} from "../../queries/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const statIcons = {
  totalUsers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 2.5 4.5V20" />
    </svg>
  ),
  admins: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  auditLogs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  securityEvents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 8 4v5c0 4-3 7-8 9-5-2-8-5-8-9V7l8-4Z" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  ),
};

const StatCard = ({ label, value, colorKey, to }) => (
  <Link
    to={to}
    className="vt-admin-stat-card rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6"
  >
    <div className="mb-3 flex items-center gap-2">
      <div className="vt-admin-stat-icon" aria-hidden="true">
        {statIcons[colorKey]}
      </div>
      <span className="text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">{label}</span>
    </div>
    <div className={`${SERIF} text-[32px] font-bold text-[#ededf2]`}>{value}</div>
  </Link>
);

export default function AdminOverview() {
  const { user } = useAuth();
  const userId = user?.id;
  const usersQuery = useAdminUsers(userId);
  const adminsQuery = useAdmins(userId);
  const logsQuery = useAuditLogs(userId, { page: 1, limit: 1 });
  const eventsQuery = useSecurityEvents(userId, { page: 1, limit: 1 });
  const paymentsQuery = useAdminPayments(userId);
  const loading = [
    usersQuery,
    adminsQuery,
    logsQuery,
    eventsQuery,
    paymentsQuery,
  ].some((query) => query.isPending);
  const stats = {
    totalUsers: usersQuery.data?.count || 0,
    admins: adminsQuery.data?.count || 0,
    auditLogs: logsQuery.data?.total || 0,
    securityEvents: eventsQuery.data?.total || 0,
    payments: paymentsQuery.data?.count || 0,
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking-[-0.01em] text-[#ededf2]`}>
          Overview
        </h1>
        <p className="mt-1 text-[#9a9aae]">Administrative summary of the VocabTrainer platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} colorKey="totalUsers" to="/admin/users" />
        <StatCard label="Admins" value={stats.admins} colorKey="admins" to="/admin/admins" />
        <StatCard label="Audit Log Entries" value={stats.auditLogs} colorKey="auditLogs" to="/admin/audit-logs" />
        <StatCard label="Security Events" value={stats.securityEvents} colorKey="securityEvents" to="/admin/security-events" />
        <StatCard label="Payments" value={stats.payments} colorKey="payments" to="/admin/payments" />
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
        <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
          Quick actions
        </h2>
        <p className="text-[#9a9aae]">
          Use the sidebar to manage users, admins, audit logs, and security events.
          All administrative actions are logged and auditable.
        </p>
      </div>
    </div>
  );
}
