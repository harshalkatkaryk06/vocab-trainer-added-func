import { useState, useEffect } from "react";
import {
  getAdminUsers,
  getAdmins,
  getAuditLogs,
  getSecurityEvents,
} from "../../api/admin";
import { getAllPayments } from "../../api/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const statColor = (label) => {
  switch (label) {
    case "totalUsers":
      return "from-[#7c6cff] to-[#5b4fd6]";
    case "admins":
      return "from-[#f59e0b] to-[#ef8e3c]";
    case "auditLogs":
      return "from-[#60a5fa] to-[#818cf8]";
    case "securityEvents":
      return "from-[#fb7185] to-[#f43f5e]";
    case "payments":
      return "from-[#fb7185] to-[#f43f5e]";
    default:
      return "from-[#7c6cff] to-[#5b4fd6]";
  }
};

const StatCard = ({ label, value, colorKey }) => (
  <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
    <div className="mb-3 flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br {statColor(colorKey)}">
        <span className="text-white text-[11px]">{label === "totalUsers" ? "👥" : label === "admins" ? "🛡️" : label === "auditLogs" ? "📋" : label === "securityEvents" ? "🚨" : label === "payments" ? "💳" : ""}</span>
      </div>
      <span className="text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">{label}</span>
    </div>
    <div className={`${SERIF} text-[32px] font-bold text-[#ededf2]`}>{value}</div>
  </div>
);

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    auditLogs: 0,
    securityEvents: 0,
    payments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, adminsRes, logsRes, eventsRes, paymentsRes] =
          await Promise.all([
            getAdminUsers(),
            getAdmins(),
            getAuditLogs({ page: 1, limit: 1 }),
            getSecurityEvents({ page: 1, limit: 1 }),
            getAllPayments(),
          ]);
        setStats({
          totalUsers: usersRes.data.count,
          admins: adminsRes.data.count,
          auditLogs: logsRes.data.total,
          securityEvents: eventsRes.data.total,
          payments: paymentsRes.data.count,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <StatCard label="Total Users" value={stats.totalUsers} colorKey="totalUsers" />
        <StatCard label="Admins" value={stats.admins} colorKey="admins" />
        <StatCard label="Audit Log Entries" value={stats.auditLogs} colorKey="auditLogs" />
        <StatCard label="Security Events" value={stats.securityEvents} colorKey="securityEvents" />
        <StatCard label="Payments" value={stats.payments} colorKey="payments" />
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
