import { useState, useEffect } from "react";
import {
  getAllSubscriptions,
  revokeAccess,
} from "../../api/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const statusColor = (s) => {
  switch (s) {
    case "active":
      return "text-[#5ee08a] bg-[#5ee08a]/10 border-[#5ee08a]/20";
    case "expired":
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
    case "revoked":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "cancelled":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    default:
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
  }
};

const typeColor = (t) =>
  t === "purchase"
    ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
    : "bg-[#7c6cff]/10 text-[#7c6cff] border-[#7c6cff]/20";

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [revoking, setRevoking] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAllSubscriptions();
        if (res.data.success) setSubs(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = subs.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    return true;
  });

  const revoke = async (id, reason) => {
    if (!window.confirm("Revoke this subscription?")) return;
    setRevoking(id);
    try {
      const res = await revokeAccess(id, reason || "Revoked by admin");
      if (res.data.success) {
        setMsg({ type: "ok", text: "Subscription revoked." });
        setSubs((prev) =>
          prev.map((s) =>
            s._id === id ? { ...s, status: "revoked" } : s
          )
        );
      } else {
        setMsg({ type: "err", text: res.data.message || "Failed to revoke." });
      }
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "Failed to revoke." });
    } finally {
      setRevoking(null);
    }
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
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking[-0.01em] text-[#ededf2]`}>
          Subscriptions
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          View and manage all user subscriptions across the platform.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">Status</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">Type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          >
            <option value="all">All Types</option>
            <option value="manual">Manual Grant</option>
            <option value="purchase">Purchase</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">User</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Plan</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Type</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Status</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Starts</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Expires</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Granted By</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.map((s) => (
              <tr key={s._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="font-medium text-[#ededf2]">{s.user?.username || "—"}</div>
                  <div className="text-[12px] text-[#9a9aae]">{s.user?.email || "—"}</div>
                </td>
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">
                  {s.planSnapshot?.displayName || "—"}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${typeColor(s.type)}`}>
                    {s.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor(s.status)}`}>
                    {s.status}
                  </span>
                  {s.cancelledAt && (
                    <div className="text-[10px] text-[#9a9aae] mt-1">
                      Cancelled: {fmtDate(s.cancelledAt)}
                    </div>
                  )}
                  {s.cancellationReason && (
                    <div className="text-[10px] text-[#9a9aae]">
                      Reason: {s.cancellationReason}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">
                  {fmtDate(s.startDate)}
                </td>
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">
                  {s.expiryDate ? fmtDate(s.expiryDate) : "—"}
                </td>
                <td className="px-6 py-4 text-[#9a9aae] text-[12px]">
                  {s.grantedByEmail || "—"}
                </td>
                <td className="px-6 py-4">
                  {s.status === "active" ? (
                    <button
                      onClick={() => revoke(s._id, "Admin revocation")}
                      disabled={revoking === s._id}
                      className="cursor-pointer rounded px-3 py-1.5 text-[11px] font-medium transition-colors border border-[#fb7185]/20 bg-[#fb7185]/10 text-[#fb7185] hover:bg-[#fb7185]/20 disabled:opacity-50"
                    >
                      {revoking === s._id ? "…" : "Revoke"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#6a6a7c]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No subscriptions found.</p>
        </div>
      )}

      {msg && (
        <div
          className={`mt-4 rounded-[10px] border-[0.5px] px-3.5 py-2.5 text-[13px] ${
            msg.type === "ok"
              ? "border-[rgba(94,224,138,0.3)] bg-[rgba(94,224,138,0.1)] text-[#5ee08a]"
              : "border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] text-[#ff7b7b]"
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
