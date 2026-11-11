import { useCallback, useEffect, useState } from "react";
import {
  approveCancellationRequest,
  getAdminCancellationRequests,
  rejectCancellationRequest,
} from "../../api/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const PAGE_SIZE = 25;

const statuses = [
  { value: "", label: "All statuses" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const statusClass = (status) => {
  switch (status) {
    case "pending_review":
      return "border-[#f5b942]/20 bg-[#f5b942]/10 text-[#f5b942]";
    case "approved":
      return "border-[#7c6cff]/20 bg-[#7c6cff]/10 text-[#b6abff]";
    case "completed":
      return "border-[#5ee08a]/20 bg-[#5ee08a]/10 text-[#5ee08a]";
    case "rejected":
      return "border-[#fb7185]/20 bg-[#fb7185]/10 text-[#fb7185]";
    default:
      return "border-white/[0.07] bg-white/[0.03] text-[#9a9aae]";
  }
};

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtMoney = (paise, currency = "INR") =>
  `${currency} ${(Number(paise || 0) / 100).toFixed(2)}`;

const displayStatus = (status = "") => status.replace(/_/g, " ");

export default function CancellationRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [decision, setDecision] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminCancellationRequests({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      if (!response.data.success) {
        throw new Error(response.data.message || "Could not load cancellation requests.");
      }
      setRequests(response.data.data);
      setTotal(response.data.total);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          loadError.message ||
          "Could not load cancellation requests."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  const openDecision = (request, action) => {
    setActiveRequest(request);
    setDecision(action);
    setReviewerNote("");
    setActionError("");
  };

  const closeDecision = () => {
    if (submitting) return;
    setActiveRequest(null);
    setDecision("");
    setReviewerNote("");
    setActionError("");
  };

  const submitDecision = async () => {
    if (!activeRequest || submitting) return;
    setSubmitting(true);
    setActionError("");
    try {
      const decide =
        decision === "approve"
          ? approveCancellationRequest
          : rejectCancellationRequest;
      const response = await decide(activeRequest._id, reviewerNote.trim());
      if (!response.data.success) {
        throw new Error(response.data.message || "The decision could not be saved.");
      }
      setActiveRequest(null);
      setDecision("");
      setReviewerNote("");
      await loadRequests();
    } catch (submitError) {
      setActionError(
        submitError.response?.data?.message ||
          submitError.message ||
          "The decision could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const snapshot = activeRequest?.refundSnapshot;
  const approvingRefund = decision === "approve" && snapshot?.refundAmount > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className={`${SERIF} m-0 text-[34px] font-bold text-[#ededf2]`}>
            Cancellation requests
          </h1>
          <p className="mt-1 text-[#9a9aae]">
            Review customer requests. Approval may initiate a refund and end
            subscription access.
          </p>
        </div>
        <label className="flex items-center gap-3 text-xs uppercase tracking-[0.08em] text-[#9a9aae]">
          Status
          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            className="rounded-[10px] border border-white/[0.08] bg-[#15151f] px-3 py-2 text-sm normal-case tracking-normal text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#fb7185]/20 bg-[#fb7185]/10 p-4 text-sm text-[#fb7185]"
        >
          <span>{error}</span>
          <button
            onClick={loadRequests}
            className="rounded-lg border border-[#fb7185]/30 px-3 py-1.5 font-semibold hover:bg-[#fb7185]/10"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="animate-spin text-3xl text-[#b6abff]">⟳</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-[20px] border border-white/[0.07] bg-[#0f0f18] p-14 text-center">
          <p className="m-0 text-[#9a9aae]">No cancellation requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const user =
              request.userId && typeof request.userId === "object"
                ? request.userId
                : null;
            const subscription =
              request.subscriptionId &&
              typeof request.subscriptionId === "object"
                ? request.subscriptionId
                : null;
            const transaction =
              request.transactionId &&
              typeof request.transactionId === "object"
                ? request.transactionId
                : null;
            const planName =
              request.refundSnapshot?.planName ||
              transaction?.planSnapshot?.displayName ||
              subscription?.planSnapshot?.displayName ||
              "Paid plan";
            const refund = request.refundSnapshot || {};
            const canReview =
              request.status === "pending_review" && request.isOpen;

            return (
              <article
                key={request._id}
                className="rounded-[18px] border border-white/[0.07] bg-[#0f0f18] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-base font-semibold text-[#ededf2]">
                        {user?.username || "Customer"}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(request.status)}`}
                      >
                        {displayStatus(request.status)}
                      </span>
                    </div>
                    <p className="mb-0 mt-1 text-sm text-[#9a9aae]">
                      {user?.email || "Customer details unavailable"} ·{" "}
                      {planName}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#6a6a7c]">
                    <div>Submitted</div>
                    <div className="mt-1 text-[#9a9aae]">
                      {fmtDate(request.createdAt)}
                    </div>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                      Reason
                    </dt>
                    <dd className="mb-0 mt-1 text-sm text-[#ededf2]">
                      {request.reason}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                      Amount paid
                    </dt>
                    <dd className="mb-0 mt-1 text-sm text-[#ededf2]">
                      {fmtMoney(refund.amountPaid, refund.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                      Expected refund
                    </dt>
                    <dd className="mb-0 mt-1 text-sm font-semibold text-[#5ee08a]">
                      {fmtMoney(refund.refundAmount, refund.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                      Payment / refund
                    </dt>
                    <dd className="mb-0 mt-1 break-all font-mono text-xs text-[#b6abff]">
                      {transaction?.razorpayPaymentId || "Payment reference unavailable"}
                      {request.razorpayRefundId
                        ? ` / ${request.razorpayRefundId}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                      Refund status
                    </dt>
                    <dd
                      className={`mb-0 mt-1 text-sm font-semibold capitalize ${
                        (request.refundStatus || transaction?.refundStatus) === "failed"
                          ? "text-[#fb7185]"
                          : (request.refundStatus || transaction?.refundStatus) === "processed"
                            ? "text-[#5ee08a]"
                            : (request.refundStatus || transaction?.refundStatus) === "pending"
                              ? "text-[#b6abff]"
                              : "text-[#9a9aae]"
                      }`}
                    >
                      {(request.refundStatus || transaction?.refundStatus || "—").replace(/_/g, " ")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-[12px] border border-white/[0.05] bg-[#15151f] p-4">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                    Refund calculation
                  </div>
                  <p className="mb-0 mt-1 text-sm text-[#9a9aae]">
                    {refund.breakdownText || "Calculation details unavailable."}
                  </p>
                  {request.details && (
                    <>
                      <div className="mt-3 text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                        Customer details
                      </div>
                      <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-[#ededf2]">
                        {request.details}
                      </p>
                    </>
                  )}
                  {request.reviewerNote && (
                    <p className="mb-0 mt-3 text-xs text-[#9a9aae]">
                      <span className="font-semibold text-[#ededf2]">
                        Review note:
                      </span>{" "}
                      {request.reviewerNote}
                    </p>
                  )}
                </div>

                {canReview && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => openDecision(request, "reject")}
                      className="rounded-[10px] border border-[#fb7185]/25 px-4 py-2 text-xs font-semibold text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
                    >
                      Reject request
                    </button>
                    <button
                      onClick={() => openDecision(request, "approve")}
                      className="rounded-[10px] bg-[#7c6cff] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5b4fd6]"
                    >
                      Approve request
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-4 text-sm text-[#9a9aae]">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/[0.08] px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              disabled={page >= pageCount}
              className="rounded-lg border border-white/[0.08] px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancellation-decision-title"
            className="w-full max-w-[520px] rounded-[20px] border border-white/[0.1] bg-[#0f0f18] p-6 shadow-2xl"
          >
            <h2
              id="cancellation-decision-title"
              className={`${SERIF} m-0 text-[24px] font-bold text-[#ededf2]`}
            >
              {decision === "approve" ? "Approve request?" : "Reject request?"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#9a9aae]">
              {decision === "approve"
                ? approvingRefund
                  ? `This will initiate a ${fmtMoney(snapshot.refundAmount, snapshot.currency)} refund to the customer's original payment method and cancel paid access.`
                  : "This will cancel paid access. The saved calculation indicates no refund is due."
                : "This will close the request. The customer's paid subscription remains active."}
            </p>
            {actionError && (
              <div
                role="alert"
                className="mb-4 rounded-[10px] border border-[#fb7185]/20 bg-[#fb7185]/10 p-3 text-sm text-[#fb7185]"
              >
                {actionError}
              </div>
            )}
            <label
              htmlFor="reviewer-note"
              className="mb-1.5 block text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]"
            >
              Review note (optional)
            </label>
            <textarea
              id="reviewer-note"
              rows={3}
              maxLength={1000}
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              className="w-full resize-y rounded-[10px] border border-white/[0.08] bg-[#15151f] px-3 py-2 text-sm text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeDecision}
                disabled={submitting}
                className="rounded-[10px] border border-white/[0.08] px-4 py-2 text-sm text-[#9a9aae] hover:bg-white/[0.03] disabled:opacity-50"
              >
                Go back
              </button>
              <button
                onClick={submitDecision}
                disabled={submitting}
                className={`rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  decision === "approve"
                    ? "bg-[#7c6cff] hover:bg-[#5b4fd6]"
                    : "bg-[#fb7185] hover:bg-[#e6536f]"
                }`}
              >
                {submitting
                  ? "Saving..."
                  : decision === "approve"
                    ? "Confirm approval"
                    : "Confirm rejection"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
