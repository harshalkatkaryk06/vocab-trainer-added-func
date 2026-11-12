import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitCancelRequest } from "../api/subscriptions";
import {
  subscriptionQueryKeys,
  useCancelPreview,
  useMyCancelRequest,
} from "../queries/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";
const REASONS = [
  "Too expensive",
  "Not using it",
  "Found an alternative",
  "Other",
];

const fmtDate = (value) =>
  new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtMoney = (paise, currency = "INR") =>
  `${currency} ${(Number(paise || 0) / 100).toFixed(2)}`;

export default function CancelSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previewQuery = useCancelPreview(user?.id);
  const requestQuery = useMyCancelRequest(user?.id);
  const preview = previewQuery.data?.data || null;
  const request = requestQuery.data?.data || null;
  const loading = previewQuery.isPending || requestQuery.isPending;
  const loadError =
    requestQuery.error?.response?.data?.message ||
    requestQuery.error?.message ||
    previewQuery.error?.response?.data?.message ||
    previewQuery.error?.message ||
    "";
  const [actionError, setActionError] = useState("");
  const error = actionError || loadError;
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async () => {
    if (!agreed || !reason || submitting) return;
    setSubmitting(true);
    setActionError("");
    try {
      const response = await submitCancelRequest({
        reason,
        details: details.trim() || undefined,
        expectedRefundAmount: preview.refundAmount,
        acceptedTerms: true,
      });
      if (response.data.success) {
        queryClient.setQueryData(
          subscriptionQueryKeys.cancelRequest(user?.id),
          { success: true, data: response.data.data }
        );
      } else {
        setActionError(response.data.message || "Could not submit your request.");
      }
    } catch (submitError) {
      if (submitError.response?.status === 409) {
        setAgreed(false);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: subscriptionQueryKeys.cancelPreview(user?.id),
          }),
          queryClient.invalidateQueries({
            queryKey: subscriptionQueryKeys.cancelRequest(user?.id),
          }),
        ]);
        setActionError(
          submitError.response.data.message ||
            "The refund estimate changed or a request is already open. Review the latest information."
        );
      } else {
        setActionError(
          submitError.response?.data?.message ||
            "Could not submit your cancellation request."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
      </div>
    );
  }

  if (request?.isOpen || (!preview && request)) {
    return (
      <div className="mx-auto max-w-[700px] py-10">
        <div className="rounded-[20px] border-[0.5px] border-[#7c6cff]/20 bg-[#0f0f18] p-8">
          <div className="mb-4 text-3xl text-[#b6abff]">↗</div>
          <h1 className={`${SERIF} m-0 text-[30px] font-bold text-[#ededf2]`}>
            View your cancellation status
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#9a9aae]">
            Your request history, refund progress, and decision timeline are
            available in the dedicated Cancellation &amp; refund status section
            on your profile.
          </p>
          <Link
            to="/profile"
            className="mt-6 inline-block rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5b4fd6]"
          >
            Go to profile
          </Link>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="mb-4 text-2xl text-[#fb7185]">⚠</div>
        <h2 className={`${SERIF} text-[24px] font-bold text-[#ededf2]`}>
          Unable to load
        </h2>
        <p className="text-[#9a9aae]">{error}</p>
        <button
          onClick={() => {
            previewQuery.refetch();
            requestQuery.refetch();
          }}
          className="mt-6 rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-[#9a9aae]">No active paid subscription to request cancellation for.</p>
      </div>
    );
  }

  const usedPercent =
    preview.totalDays > 0
      ? Math.min(100, Math.round((preview.usedDays / preview.totalDays) * 100))
      : 0;
  const refundAmount = fmtMoney(preview.refundAmount, preview.currency);
  const amountPaid = fmtMoney(preview.amountPaid, preview.currency);

  return (
    <div className="mx-auto max-w-[700px] py-10">
      <div className="space-y-6">
        <div>
          <h1 className={`${SERIF} m-0 text-[34px] font-bold text-[#ededf2]`}>
            Request cancellation
          </h1>
          <p className="mt-1 text-[#9a9aae]">
            Your request will be reviewed before any cancellation or refund is
            processed.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-[12px] border border-[#fb7185]/20 bg-[#fb7185]/10 p-4 text-sm text-[#fb7185]"
          >
            {error}
          </div>
        )}

        <section className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8">
          <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
            What happens next
          </h2>
          <ul className="list-disc space-y-3 pl-6 text-sm text-[#9a9aae]">
            <li>Submitting this request does not cancel your plan or end your paid access.</li>
            <li>A Super Admin reviews the request and its refund calculation.</li>
            <li>No refund is initiated unless your request is approved.</li>
            <li>
              Your expected refund is calculated using the current policy and
              saved with your request for review.
            </li>
          </ul>
        </section>

        <section className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className={`${SERIF} text-[20px] font-bold text-[#ededf2]`}>
                {preview.planSnapshot?.displayName || "Your plan"}
              </div>
              <div className="text-[12px] text-[#9a9aae]">
                {preview.isFullRefundWindow
                  ? "Within full refund window"
                  : "Outside full refund window"}
              </div>
            </div>
            <div className={`${SERIF} text-[32px] font-bold text-[#ededf2]`}>
              {refundAmount}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Amount paid
              </div>
              <div className="mt-1 text-sm text-[#ededf2]">{amountPaid}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Expected refund
              </div>
              <div className="mt-1 text-sm text-[#5ee08a]">{refundAmount}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Purchase date
              </div>
              <div className="mt-1 text-sm text-[#ededf2]">
                {fmtDate(preview.subscription.startDate)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#6a6a7c]">
                Expires
              </div>
              <div className="mt-1 text-sm text-[#ededf2]">
                {fmtDate(preview.subscription.expiryDate)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-[11px] text-[#9a9aae]">
              <span>Used: {preview.usedDays} days</span>
              <span>Unused: {preview.unusedDays} days</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full bg-[#7c6cff]"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="mt-3 text-[13px] text-[#9a9aae]">
              {preview.breakdownText}
            </p>
          </div>
        </section>

        <section className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8">
          <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
            Submit your request
          </h2>
          <div className="mb-4">
            <label
              htmlFor="cancellation-reason"
              className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]"
            >
              Reason
            </label>
            <select
              id="cancellation-reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-[#15151f] px-4 py-3 text-[15px] text-[#ededf2] outline-none focus:border-[rgba(124,108,255,0.55)]"
            >
              <option value="">Select a reason</option>
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label
              htmlFor="cancellation-details"
              className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]"
            >
              Additional details (optional)
            </label>
            <textarea
              id="cancellation-details"
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="w-full resize-y rounded-[12px] border-[0.5px] border-white/[0.07] bg-[#15151f] px-4 py-3 text-sm text-[#ededf2] outline-none focus:border-[rgba(124,108,255,0.55)]"
            />
          </div>

          <label className="mb-6 flex items-start gap-3 text-sm text-[#ededf2]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 rounded border-white/[0.07] bg-[#0f0f18] text-[#7c6cff] focus:ring-[#7c6cff]"
            />
            <span>
              I have reviewed the refund estimate and agree to submit this
              cancellation request for Super Admin review.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="rounded-[12px] border-[0.5px] border-white/[0.07] px-5 py-3 text-sm font-semibold text-[#9a9aae] hover:bg-white/[0.03] hover:text-[#b6abff]"
            >
              Keep my plan
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || !agreed || !reason}
              className="rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] hover:bg-[#5b4fd6] disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit cancellation request"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
