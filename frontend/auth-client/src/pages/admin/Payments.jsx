import { useAuth } from "../../context/AuthContext";
import { useAdminPayments, usePaymentCancellationRequests } from "../../queries/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const statusColor = (s) => {
  switch (s) {
    case "paid":
      return "text-[#5ee08a] bg-[#5ee08a]/10 border-[#5ee08a]/20";
    case "refunded":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "created":
      return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
    case "failed":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "cancelled":
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
    default:
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
  }
};

const refundStatusColor = (s) => {
  switch (s) {
    case "processed":
      return "text-[#5ee08a] bg-[#5ee08a]/10 border-[#5ee08a]/20";
    case "failed":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "pending":
      return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
    default:
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
  }
};

const cancellationRequestStatusColor = (s) => {
  switch (s) {
    case "pending_review":
      return "text-[#f5b942] bg-[#f5b942]/10 border-[#f5b942]/20";
    case "approved":
      return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
    case "rejected":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "completed":
      return "text-[#5ee08a] bg-[#5ee08a]/10 border-[#5ee08a]/20";
    case "refund_initiated":
      return "text-[#7c6cff] bg-[#7c6cff]/10 border-[#7c6cff]/20";
    case "refund_processed":
      return "text-[#5ee08a] bg-[#5ee08a]/10 border-[#5ee08a]/20";
    case "refund_failed":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "completed_no_refund":
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
    case "rolled_back":
      return "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20";
    case "requested":
      return "text-[#f5b942] bg-[#f5b942]/10 border-[#f5b942]/20";
    default:
      return "text-[#9a9aae] bg-[#9a9aae]/10 border-[#9a9aae]/20";
  }
};

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function AdminPayments() {
  const { user } = useAuth();
  const paymentsQuery = useAdminPayments(user?.id);
  const cancellationRequestsQuery = usePaymentCancellationRequests(
    user?.id,
    user?.role === "super_admin"
  );
  const payments = paymentsQuery.data?.data || [];
  const cancellationRequests = cancellationRequestsQuery.data?.data || [];
  const loading = paymentsQuery.isPending ||
    (user?.role === "super_admin" && cancellationRequestsQuery.isPending);

  // Build a lookup map: transactionId -> cancellation request
  const cancellationMap = new Map();
  cancellationRequests.forEach((cr) => {
    cancellationMap.set(cr.transactionId.toString(), cr);
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
          Payments
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          View payment history, status, and transaction references.
        </p>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Date</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">User</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Plan</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Amount</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Refund Amount</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Refund Status</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Status</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Transaction ID</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Refund ID</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Cancellation Request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {payments.map((p) => {
              const cr = cancellationMap.get(p._id.toString());
              const paymentUser = p.userId;
              const userId =
                paymentUser?._id?.toString() || paymentUser?.toString?.() || "—";
              return (
                <tr key={p._id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-[#9a9aae] text-[12px]">{fmtDate(p.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="break-all font-mono text-xs text-[#b6abff]">{userId}</div>
                    {paymentUser?.email && (
                      <div className="mt-1 break-all text-[11px] text-[#9a9aae]">
                        {paymentUser.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#9a9aae]">{p.planSnapshot?.displayName || "—"}</td>
                  <td className="px-6 py-4 text-[#9a9aae]">${(p.amount / 100).toFixed(2)} {p.currency}</td>
                  <td className="px-6 py-4 text-[#9a9aae]">
                    {p.refundAmount ? `${(p.refundAmount / 100).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {p.refundStatus ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${refundStatusColor(p.refundStatus)}`}>
                        {p.refundStatus}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#9a9aae]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-[#b6abff]">
                    {p.razorpayPaymentId || p.razorpayOrderId || "—"}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-[#b6abff]">
                    {p.refundId || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {cr ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cancellationRequestStatusColor(cr.status)}`}>
                        {cr.status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#9a9aae]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payments.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No payments found.</p>
        </div>
      )}
    </div>
  );
}
