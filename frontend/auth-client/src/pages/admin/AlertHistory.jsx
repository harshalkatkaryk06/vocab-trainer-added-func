import { useState, useEffect } from "react";
import { getAlerts, resolveAlert } from "../../api/alerts";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const severityColor = (s) => {
  switch (s) {
    case "CRITICAL": return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "WARNING": return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20";
    default: return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
  }
};

const categoryColor = (c) => {
  switch (c) {
    case "authentication": return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
    case "application": return "text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20";
    case "security": return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "payment": return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20";
    case "system": return "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20";
    default: return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
  }
};

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAlerts({ limit: 100 });
        if (res.data.success) setAlerts(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resolve = async (id) => {
    await resolveAlert(id);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  const filtered = alerts.filter((a) => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

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
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking[-0.01em] text-[#ededf2]`}>
          Alert History
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          Complete history of all monitoring alerts with filtering and resolution tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">Category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          >
            <option value="all">All Categories</option>
            <option value="authentication">Authentication</option>
            <option value="application">Application</option>
            <option value="security">Security</option>
            <option value="payment">Payment</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">Severity</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          >
            <option value="all">All Severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Time</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Type</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Category</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Severity</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">User</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.map((a) => (
              <tr key={a._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">{fmtDate(a.createdAt)}</td>
                <td className="px-6 py-4 text-xs font-mono text-[#b6abff]">{a.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryColor(a.category)}`}>
                    {a.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${severityColor(a.severity)}`}>
                    {a.severity}
                  </span>
                </td>
                <td className="px-6 py-4">{a.userEmail || "—"}</td>
                <td className="px-6 py-4">
                  {a.resolved ? (
                    <span className="text-[11px] text-[#5ee08a]">Resolved</span>
                  ) : (
                    <button
                      onClick={() => resolve(a._id)}
                      className="cursor-pointer rounded px-3 py-1 text-[11px] font-medium transition-colors border border-[#7c6cff]/20 bg-[#7c6cff]/10 text-[#7c6cff] hover:bg-[#7c6cff]/20"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No alerts found.</p>
        </div>
      )}
    </div>
  );
}
