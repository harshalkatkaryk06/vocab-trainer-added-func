import { useAuth } from "../../context/AuthContext";
import { useSecurityEvents } from "../../queries/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const severityColor = (s) => {
  switch (s) {
    case "CRITICAL": return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "WARNING": return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20";
    default: return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
  }
};

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function SecurityEvents() {
  const { user } = useAuth();
  const eventsQuery = useSecurityEvents(user?.id, { page: 1, limit: 50 });
  const events = eventsQuery.data?.data || [];
  const loading = eventsQuery.isPending;

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
          Security Events
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          Security-relevant events including privilege changes and suspicious activity.
        </p>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Time</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Type</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Severity</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {events.map((e) => (
              <tr key={e._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">{fmtDate(e.createdAt)}</td>
                <td className="px-6 py-4 text-xs font-mono text-[#b6abff]">{e.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${severityColor(e.severity)}`}>
                    {e.severity}
                  </span>
                </td>
                <td className="px-6 py-4">{e.userEmail || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No security events found.</p>
        </div>
      )}
    </div>
  );
}
