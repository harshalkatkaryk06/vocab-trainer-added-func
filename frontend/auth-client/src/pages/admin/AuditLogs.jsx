import { useAuth } from "../../context/AuthContext";
import { useAuditLogs } from "../../queries/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function AuditLogs() {
  const { user } = useAuth();
  const logsQuery = useAuditLogs(user?.id, { page: 1, limit: 50 });
  const logs = logsQuery.data?.data || [];
  const loading = logsQuery.isPending;

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
          Audit Logs
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          History of administrative actions performed on the platform.
        </p>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Time</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Actor</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Role</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Action</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {logs.map((log) => (
              <tr key={log._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">{fmtDate(log.createdAt)}</td>
                <td className="px-6 py-4">{log.actorEmail}</td>
                <td className="px-6 py-4 text-[12px] text-[#9a9aae]">{log.actorRole}</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono text-[#b6abff]">{log.action}</span>
                </td>
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">{log.targetEmail || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No audit log entries found.</p>
        </div>
      )}
    </div>
  );
}
