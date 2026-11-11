import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getQuizAttempts } from "../api/quiz";
import {
  getMyEntitlement,
  getMyCancelRequest,
  getPaymentHistory,
} from "../api/subscriptions";
const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const scoreColor = (pct) =>
  pct >= 80 ? "#5ee08a" : pct >= 50 ? "#f5b942" : "#ff7b7b";

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtTimelineDate = (value) => {
  if (!value) return "Time not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not available";
  return date.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtMoney = (paise, currency = "INR") => {
  const amount = paise / 100;
  return `${currency} ${amount.toFixed(2)}`;
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // ── Edit state ──
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  // ── Quiz history ──
  const [attempts, setAttempts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // ── Plan / usage ──
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [cancelRequest, setCancelRequest] = useState(null);
  const [loadingCancelRequest, setLoadingCancelRequest] = useState(true);
  const [cancelRequestError, setCancelRequestError] = useState("");

  // ── Payment history ──
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const isGoogle = user?.provider === "google";

  useEffect(() => {
    if (user) setForm({ username: user.username || "", email: user.email || "" });
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      try {
        const res = await getQuizAttempts();
        if (res.data.success) setAttempts(res.data.data);
      } catch (_) {}
      setLoadingHistory(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPlan(true);
      try {
        const res = await getMyEntitlement();
        if (res.data.success) setPlan(res.data.data);
      } catch (_) {}
      setLoadingPlan(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyCancelRequest();
        if (res.data.success) setCancelRequest(res.data.data);
      } catch (error) {
        setCancelRequestError(
          error?.response?.data?.message ||
            "Cancellation request status could not be loaded."
        );
        console.error("Could not load cancellation request:", error);
      } finally {
        setLoadingCancelRequest(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPayments(true);
      try {
        const res = await getPaymentHistory();
        if (res.data.success) setPayments(res.data.data);
      } catch (_) {}
      setLoadingPayments(false);
    })();
  }, []);

  const startEdit = () => {
    setForm({ username: user.username || "", email: user.email || "" });
    setSaveError(""); setSaveOk(false); setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setSaveError(""); };

  const save = async () => {
    setSaving(true); setSaveError(""); setSaveOk(false);
    try {
      const payload = { username: form.username };
      if (!isGoogle) payload.email = form.email; // email locked for Google accounts
      const res = await updateUser(payload);
      if (res.success) { setSaveOk(true); setEditing(false); setTimeout(() => setSaveOk(false), 2500); }
      else setSaveError(res.message || "Could not update profile.");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Could not update profile.");
    }
    setSaving(false);
  };

  const handleCancelPlan = () => {
    // Navigate to the CancelSubscription page — one UI only.
    navigate("/subscription/cancel");
  };

  const cancellationStatusColor =
    cancelRequest?.status === "pending_review"
      ? "text-[#f5b942] border-[#f5b942]/25 bg-[#f5b942]/10"
      : cancelRequest?.status === "rejected" ||
          cancelRequest?.refundStatus === "failed"
        ? "text-[#fb7185] border-[#fb7185]/25 bg-[#fb7185]/10"
        : cancelRequest?.status === "completed" ||
            cancelRequest?.refundStatus === "processed"
          ? "text-[#5ee08a] border-[#5ee08a]/25 bg-[#5ee08a]/10"
          : "text-[#b6abff] border-[#7c6cff]/25 bg-[#7c6cff]/10";

  const cancellationTimeline = cancelRequest
    ? [
        {
          title: "Plan purchased",
          timestamp: cancelRequest.purchasedAt,
          description: cancelRequest.planName,
        },
        {
          title: "Cancellation request submitted",
          timestamp: cancelRequest.createdAt,
          description: `Reason: ${cancelRequest.reason}`,
        },
        cancelRequest.reviewedAt
          ? {
              title:
                cancelRequest.status === "rejected"
                  ? "Request rejected"
                  : "Request approved",
              timestamp: cancelRequest.reviewedAt,
              description:
                cancelRequest.reviewerNote || "No review message was provided.",
            }
          : {
              title: "Awaiting Super Admin review",
              timestamp: null,
              description: "Your paid access remains active while this is pending.",
              pending: true,
            },
        cancelRequest.refundStatus
          ? {
              title: `Refund ${cancelRequest.refundStatus}`,
              timestamp: cancelRequest.refundUpdatedAt,
              description:
                cancelRequest.refundStatus === "processed"
                  ? "The refund has been processed by the payment provider."
                  : cancelRequest.refundStatus === "failed"
                    ? "The payment provider could not process the refund. Contact support for assistance."
                    : "The refund has been initiated and is being processed.",
            }
          : cancelRequest.status === "completed"
            ? {
                title: "Refund not applicable",
                timestamp: cancelRequest.reviewedAt,
                description: "The approved refund calculation was zero.",
              }
            : null,
      ].filter(Boolean)
    : [];

  // ── Derived stats ──
  const total = attempts.length;
  const avg = total ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / total) : 0;
  const best = total ? Math.max(...attempts.map((a) => a.percentage)) : 0;

  const initial = (user?.username || "?").charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-[820px] flex-1 px-6 pb-16 pt-12">
      {/* ── Profile card ── */}
      <div className="relative rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
        {!editing && (
          <button
            onClick={startEdit}
            aria-label="Edit profile"
            title="Edit profile"
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-white/[0.07] text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-5">
          <div className={`${SERIF} flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c6cff] to-[#5b4fd6] text-3xl font-bold text-white`}>
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            {!editing ? (
              <>
                <h1 className={`${SERIF} m-0 truncate text-[34px] font-extrabold tracking-[-0.01em] text-[#ededf2]`}>
                  @{user?.username}
                </h1>
                <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-sm text-[#9a9aae]">
                  {user?.email}
                  <span className="rounded-full border-[0.5px] border-white/[0.07] bg-[#15151f] px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                    {user?.provider === "google" ? "Google" : "Email"}
                  </span>
                </p>
                {saveOk && <p className="m-0 mt-2 text-[13px] text-[#5ee08a]">✓ Profile updated</p>}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[15px] text-[#ededf2] outline-none transition-all focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled={isGoogle}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={`w-full rounded-[10px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[15px] text-[#ededf2] outline-none transition-all focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)] ${
                      isGoogle ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  />
                  {isGoogle && (
                    <p className="m-0 mt-1 text-[11.5px] text-[#6a6a7c]">Email is managed by your Google account.</p>
                  )}
                </div>

                {saveError && <p className="m-0 text-[13px] text-[#ff7b7b]">{saveError}</p>}

                <div className="flex gap-2.5">
                  <button
                    onClick={save}
                    disabled={saving}
                    className={`rounded-[10px] bg-[#7c6cff] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px ${saving ? "opacity-70" : "cursor-pointer"}`}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="cursor-pointer rounded-[10px] border-[0.5px] border-white/[0.07] bg-transparent px-5 py-2.5 text-[13.5px] font-medium text-[#9a9aae] transition-all hover:text-[#ededf2]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {!editing && total > 0 && (
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-6">
            {[
              { label: "Quizzes taken", value: total },
              { label: "Average score", value: `${avg}%` },
              { label: "Best score", value: `${best}%` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`${SERIF} text-[26px] font-bold text-[#ededf2]`}>{s.value}</div>
                <div className="text-[11.5px] uppercase tracking-[0.08em] text-[#6a6a7c]">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Plan & AI usage ── */}
      {!editing && (
        <div className="mt-8 rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={`${SERIF} m-0 text-[26px] font-bold tracking[-0.01em] text-[#ededf2]`}>
                Your plan
              </h2>
              <p className="m-0 mt-1 text-[#9a9aae]">Current subscription and AI usage.</p>
            </div>
            {plan?.isUnlimited ? (
              <span className="rounded-full border border-[#5ee08a]/30 bg-[#5ee08a]/10 px-3 py-1 text-[11px] font-semibold text-[#5ee08a] uppercase tracking-[0.1em]">
                Active · Unlimited
              </span>
            ) : plan?.subscription ? (
              <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-[11px] font-semibold text-[#f59e0b] uppercase tracking-[0.1em]">
                Active · Expires {new Date(plan.subscription.expiryDate).toLocaleDateString()}
              </span>
            ) : (
              <span className="rounded-full border border-[#7c6cff]/30 bg-[#7c6cff]/10 px-3 py-1 text-[11px] font-semibold text-[#7c6cff] uppercase tracking-[0.1em]">
                Free plan
              </span>
            )}
            {plan?.subscription?.type === "purchase" &&
            plan?.subscription?.status === "active" &&
            !loadingCancelRequest &&
            !cancelRequest?.isOpen ? (
              <button
                onClick={handleCancelPlan}
                className="mt-3 rounded-[12px] border-[0.5px] border-[#fb7185]/20 bg-[#fb7185]/10 px-3 py-1.5 text-[11px] font-semibold text-[#fb7185] hover:bg-[#fb7185]/20"
              >
                Cancel plan
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#15151f] p-5">
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c] mb-2">Plan</div>
              <div className={`${SERIF} text-[20px] font-bold text-[#ededf2]`}>
                {plan?.plan?.displayName || "Free"}
              </div>
              <div className="mt-1 text-[12px] text-[#9a9aae]">{plan?.plan?.description || "Limited AI calls per day."}</div>
            </div>

            <div className="rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#15151f] p-5">
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c] mb-2">AI calls today</div>
                <div className="flex items-baseline gap-2">
                  <div className={`${SERIF} text-[32px] font-bold text-[#ededf2]`}>
                    {plan?.isUnlimited ? "∞" : plan?.callsConsumed}
                  </div>
                  {plan?.isUnlimited ? null : (
                    <span className="text-[16px] font-medium text-[#9a9aae]">
                      / {plan?.limit}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  {plan?.isUnlimited ? null : (
                    <div
                      className="h-full rounded-full bg-[#7c6cff]"
                      style={{
                        width: `${
                          Math.min(
                            100,
                            Math.round(
                              ((plan?.callsConsumed ?? 0) /
                                Math.max(1, plan?.limit ?? 1)) *
                                100
                            )
                          )
                        }%`,
                      }}
                    />
                  )}
                </div>
                {plan?.isUnlimited ? (
                  <p className="mt-2 text-[12px] text-[#5ee08a]">
                    Unlimited while your subscription is active.
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] text-[#9a9aae]">
                    {plan?.remaining} remaining today · resets at midnight
                  </p>
                )}
            </div>

            <div className="rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#15151f] p-5">
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c] mb-2">Subscription</div>
              <div className="text-[16px] font-medium text-[#ededf2]">
                {plan?.subscription?.type === "purchase" ? "Purchased" : "Manually granted"}
              </div>
              {plan?.subscription?.expiryDate ? (
                <div className="mt-1 text-[12px] text-[#9a9aae]">
                  Expires {new Date(plan.subscription.expiryDate).toLocaleDateString()}
                </div>
              ) : (
                <p className="mt-1 text-[12px] text-[#9a9aae]">No expiration (free plan)</p>
              )}
              {plan?.subscription?.grantedByEmail && (
                <p className="mt-1 text-[12px] text-[#9a9aae]">Granted by {plan.subscription.grantedByEmail}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {cancelRequest && (
        <section
          id="cancellation-status"
          className="mt-8 rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className={`${SERIF} m-0 text-[26px] font-bold text-[#ededf2]`}>
                Cancellation &amp; refund status
              </h2>
              <p className="mb-0 mt-1 text-sm text-[#9a9aae]">
                Review your plan purchase, request, decision, and refund timeline.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${cancellationStatusColor}`}
            >
              {cancelRequest.refundStatus
                ? `Refund ${cancelRequest.refundStatus.replace(/_/g, " ")}`
                : cancelRequest.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[14px] border border-white/[0.06] bg-[#15151f] p-4">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Plan
              </div>
              <div className="mt-1 text-sm font-semibold text-[#ededf2]">
                {cancelRequest.planName}
              </div>
            </div>
            <div className="rounded-[14px] border border-white/[0.06] bg-[#15151f] p-4">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Amount paid
              </div>
              <div className="mt-1 text-sm font-semibold text-[#ededf2]">
                {fmtMoney(cancelRequest.amountPaid, cancelRequest.currency)}
              </div>
            </div>
            <div className="rounded-[14px] border border-white/[0.06] bg-[#15151f] p-4">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Expected refund
              </div>
              <div className="mt-1 text-sm font-semibold text-[#b6abff]">
                {fmtMoney(
                  cancelRequest.expectedRefundAmount,
                  cancelRequest.currency
                )}
              </div>
            </div>
            <div className="rounded-[14px] border border-white/[0.06] bg-[#15151f] p-4">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Refund status
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-[#ededf2]">
                {cancelRequest.refundStatus || "Not processed"}
              </div>
              {cancelRequest.refundAmount !== null &&
                cancelRequest.refundAmount !== undefined && (
                  <div className="mt-1 text-xs text-[#9a9aae]">
                    Recorded amount:{" "}
                    {fmtMoney(cancelRequest.refundAmount, cancelRequest.currency)}
                  </div>
                )}
            </div>
          </div>

          <div className="mt-7">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9aae]">
              Request timeline
            </h3>
            <ol className="space-y-0">
              {cancellationTimeline.map((event, index) => (
                <li
                  key={`${event.title}-${event.timestamp || "pending"}`}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {index < cancellationTimeline.length - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-white/[0.09]" />
                  )}
                  <span
                    className={`relative mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                      event.pending
                        ? "border-[#f5b942] bg-[#15151f]"
                        : "border-[#7c6cff] bg-[#7c6cff]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h4 className="m-0 text-sm font-semibold text-[#ededf2]">
                        {event.title}
                      </h4>
                      <time className="text-xs text-[#b6abff]">
                        {fmtTimelineDate(event.timestamp)}
                      </time>
                    </div>
                    <p className="mb-0 mt-1 whitespace-pre-wrap text-xs leading-5 text-[#9a9aae]">
                      {event.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 rounded-[14px] border border-white/[0.06] bg-[#15151f] p-4 text-xs text-[#9a9aae]">
            <div>
              <span className="font-semibold text-[#ededf2]">Request ID:</span>{" "}
              <span className="font-mono">{cancelRequest._id}</span>
            </div>
            <div className="mt-2">
              <span className="font-semibold text-[#ededf2]">Reason:</span>{" "}
              {cancelRequest.reason}
            </div>
            {cancelRequest.details && (
              <p className="mb-0 mt-2 whitespace-pre-wrap">
                {cancelRequest.details}
              </p>
            )}
            {cancelRequest.reviewerNote && (
              <p className="mb-0 mt-2 whitespace-pre-wrap">
                <span className="font-semibold text-[#ededf2]">
                  Super Admin message:
                </span>{" "}
                {cancelRequest.reviewerNote}
              </p>
            )}
            {cancelRequest.razorpayRefundId && (
              <div className="mt-2 break-all">
                <span className="font-semibold text-[#ededf2]">
                  Refund reference:
                </span>{" "}
                <span className="font-mono">{cancelRequest.razorpayRefundId}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {cancelRequestError && (
        <p className="mt-4 text-sm text-[#fb7185]" role="alert">
          {cancelRequestError}
        </p>
      )}

      {/* ── Quiz history ── */}
      <h2 className={`${SERIF} mb-4 mt-10 text-[26px] font-bold tracking[-0.01em] text-[#ededf2]`}>
        Quiz history
      </h2>

      {loadingHistory && <div className="py-10 text-center text-[#9a9aae]">Loading your attempts…</div>}

      {!loadingHistory && attempts.length === 0 && (
        <div className="rounded-[18px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] px-8 py-14 text-center">
          <div className="mb-3 text-[36px]">📝</div>
          <p className="m-0 text-[15px] text-[#9a9aae]">No quizzes saved yet. Take a quiz and save the attempt!</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {attempts.map((a) => {
          const open = expanded === a._id;
          const color = scoreColor(a.percentage);
          return (
            <div key={a._id} className="overflow-hidden rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
              {/* Summary row (always visible) */}
              <button
                onClick={() => setExpanded(open ? null : a._id)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`${SERIF} text-[20px] font-bold text-[#ededf2]`}>
                      {a.score}/{a.total}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                      style={{ color, background: `${color}1f` }}
                    >
                      {a.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-[#6a6a7c]">{fmtDate(a.createdAt)}</div>
                </div>

                <div className="flex items-center gap-3">
                  {/* mini progress bar */}
                  <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                    <div className="h-full rounded-full" style={{ width: `${a.percentage}%`, background: color }} />
                  </div>
                  <svg
                    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6a6a7c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {open && (
                <div className="border-t border-white/[0.06] px-5 py-4">
                  {a.quote && (
                    <p className={`${SERIF} m-0 mb-4 text-[14px] italic text-[#b6abff]`}>"{a.quote}"</p>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {a.questions.map((q, i) => (
                      <div key={i} className="rounded-[10px] bg-[#15151f] px-4 py-3">
                        <div className="mb-1 flex items-center gap-2.5">
                          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            q.isCorrect ? "bg-[rgba(46,184,114,0.14)] text-[#5ee08a]" : "bg-[rgba(255,123,123,0.12)] text-[#ff7b7b]"
                          }`}>
                            {q.isCorrect ? "✓" : "✕"}
                          </span>
                          <span className={`${SERIF} text-[17px] font-bold text-[#ededf2]`}>{q.word}</span>
                        </div>
                        <p className="m-0 text-[13px] leading-[1.55] text-[#5ee08a]">
                          <span className="text-[#6a6a7c]">Correct: </span>{q.correctAnswer}
                        </p>
                        {!q.isCorrect && (
                          <p className="m-0 mt-0.5 text-[13px] leading-[1.55] text-[#ff7b7b]">
                            <span className="text-[#6a6a7c]">You chose: </span>
                            {q.chosenIndex === null || q.chosenIndex === undefined ? "— (skipped)" : q.chosenAnswer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Payment history ── */}
      <h2 className={`${SERIF} mb-4 mt-10 text-[26px] font-bold tracking[-0.01em] text-[#ededf2]`}>
        Payment history
      </h2>

      {loadingPayments && <div className="py-10 text-center text-[#9a9aae]">Loading payment history…</div>}

      {!loadingPayments && payments.length === 0 && (
        <div className="rounded-[18px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] px-8 py-14 text-center">
          <div className="mb-3 text-[36px]">💳</div>
          <p className="m-0 text-[15px] text-[#9a9aae]">No payments yet. Upgrade to a paid plan to see your payment history here.</p>
        </div>
      )}

      {!loadingPayments && payments.length > 0 && (
        <div className="flex flex-col gap-3">
          {payments.map((p) => {
            const paid = p.status === "paid";
            return (
              <div key={p._id} className="rounded-[16px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#ededf2]">{p.planSnapshot?.displayName || "Plan"}</div>
                    <div className="text-[12px] text-[#9a9aae]">{p.description || "Subscription payment"}</div>
                  </div>
                  <div className="text-right">
                    <div className={`${SERIF} text-[18px] font-bold ${paid ? "text-[#5ee08a]" : "text-[#9a9aae]"}`}>
                      ${(p.amount / 100).toFixed(2)} {p.currency}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.08em] mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        paid
                          ? "bg-[#5ee08a]/10 text-[#5ee08a] border-[#5ee08a]/20"
                          : "bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/20"
                      }`}>
                        {paid ? "Paid" : p.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[12px] text-[#9a9aae]">
                  <span>Date: {fmtDate(p.createdAt)}</span>
                  {p.razorpayPaymentId && (
                    <span>Tx: {p.razorpayPaymentId}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
