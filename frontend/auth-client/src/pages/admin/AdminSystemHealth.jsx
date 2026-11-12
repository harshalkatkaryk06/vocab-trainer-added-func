import { useAuth } from "../../context/AuthContext";
import { useAdminSystemHealth } from "../../queries/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const StatCard = ({ label, value, subtitle, colorKey }) => {
  const colors = {
    users: "from-[#7c6cff] to-[#5b4fd6]",
    subscriptions: "from-[#fb7185] to-[#f43f5e]",
    ai: "from-[#60a5fa] to-[#818cf8]",
    alerts: "from-[#f59e0b] to-[#ef8e3c]",
  };
  return (
    <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br {colors[colorKey]}">
          <span className="text-white text-[11px]">
            {colorKey === "users" ? "👥" : colorKey === "subscriptions" ? "💳" : colorKey === "ai" ? "🤖" : "🚨"}
          </span>
        </div>
        <span className="text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">{label}</span>
      </div>
      <div className={`${SERIF} text-[32px] font-bold text-[#ededf2]`}>{value}</div>
      {subtitle && <div className="mt-1 text-[11px] text-[#9a9aae]">{subtitle}</div>}
    </div>
  );
};

export default function AdminSystemHealth() {
  const { user } = useAuth();
  const healthQuery = useAdminSystemHealth(user?.id);
  const health = healthQuery.data?.data || null;
  const loading = healthQuery.isPending;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
      </div>
    );
  }

  const h = health || {
    users: { total: 0, admins: 0, superAdmins: 0 },
    subscriptions: { total: 0, active: 0, expired: 0 },
    aiUsage: { totalCalls: 0 },
    alerts: { last24h: 0 },
    status: "healthy",
    timestamp: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking[-0.01em] text-[#ededf2]`}>
          System Health
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          Platform health metrics and system status overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={h.users.total} subtitle={`Admins: ${h.users.admins} • Super Admins: ${h.users.superAdmins}`} colorKey="users" />
        <StatCard label="Subscriptions" value={h.subscriptions.total} subtitle={`Active: ${h.subscriptions.active} • Expired: ${h.subscriptions.expired}`} colorKey="subscriptions" />
        <StatCard label="AI Calls (Total)" value={h.aiUsage.totalCalls} subtitle="All-time AI calls consumed" colorKey="ai" />
        <StatCard label="Alerts (24h)" value={h.alerts.last24h} subtitle="Security & system alerts" colorKey="alerts" />
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
        <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
          System Status
        </h2>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5ee08a]/10 text-[#5ee08a] border border-[#5ee08a]/20 text-[10px] font-semibold">
            ● Operational
          </span>
          <span className="text-[#9a9aae] text-sm">All systems operational. Last checked: {new Date(h.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
