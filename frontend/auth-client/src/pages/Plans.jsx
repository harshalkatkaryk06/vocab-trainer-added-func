import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import {
  grantAccess,
  createOrder,
  verifyPayment,
} from "../api/subscriptions";
import { subscriptionQueryKeys, useMyEntitlement, usePlanCatalog } from "../queries/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

export default function PlansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const plansQuery = usePlanCatalog();
  const entitlementQuery = useMyEntitlement(user?.id);
  const plans = plansQuery.data?.data || [];
  const entitlement = entitlementQuery.data?.data || null;
  const loading = plansQuery.isPending || entitlementQuery.isPending;
  const [granting, setGranting] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [msg, setMsg] = useState(null);
  const loadError =
    plansQuery.error?.response?.data?.message ||
    plansQuery.error?.message ||
    entitlementQuery.error?.response?.data?.message ||
    entitlementQuery.error?.message ||
    "";
  // 1. Store only a true/false flag. Never store window.Razorpay itself in state:
  //    it is a function, and React treats a function passed to a state setter
  //    as an "updater" and calls it, which makes Razorpay throw "Invalid options".
  const [gatewayReady, setGatewayReady] = useState(false);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    loadRazorpay().then((rz) => {
      const loadedOk = rz ? true : false;
      setGatewayReady(loadedOk);
    });
  }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantEmail.trim()) {
      setMsg({ type: "err", text: "Enter a valid email address." });
      return;
    }
    setGranting(true);
    try {
      const res = await grantAccess(grantEmail.trim(), parseInt(grantDays, 10));
      if (res.data.success) {
        setMsg({ type: "ok", text: `Paid access granted to ${grantEmail.trim()}.` });
        setGrantEmail("");
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKeys.entitlement(user?.id),
        });
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKeys.systemHealth(user?.id),
        });
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKeys.adminSubscriptions(user?.id),
        });
      } else {
        setMsg({ type: "err", text: res.data.message || "Could not grant access." });
      }
    } catch (err) {
      setMsg({
        type: "err",
        text: err?.response?.data?.message || "Could not grant access.",
      });
    } finally {
      setGranting(false);
    }
  };

  const isActiveSub = (plan) => {
    if (!entitlement?.subscription) return false;
    return entitlement.subscription.planId === plan._id && entitlement.subscription.status === "active";
  };

  const isUnlimited = (p) =>
    p.aiCalls === "unlimited" || p.aiCalls === null || p.aiCalls === undefined;

  const subscribe = async (plan) => {
    // 3. Read the constructor straight from window at click time.
    const RazorpayCheckout = window.Razorpay;
    if (!gatewayReady || !RazorpayCheckout) {
      setMsg({ type: "err", text: "Payment gateway not loaded. Please refresh." });
      return;
    }
    setPaying(plan._id);
    setMsg(null);
    try {
      const orderRes = await createOrder(plan._id);
      const { orderId, amount, keyId } = orderRes.data.data;

      const options = {
        key: keyId,
        amount,
        currency: orderRes.data.data.currency,
        name: "VocabTrainer",
        description: `Subscription to ${plan.displayName}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              setMsg({ type: "ok", text: "Payment successful! Subscription activated." });
              await queryClient.invalidateQueries({
                queryKey: subscriptionQueryKeys.entitlement(user?.id),
              });
              await queryClient.invalidateQueries({
                queryKey: subscriptionQueryKeys.paymentHistory(user?.id),
              });
            } else {
              setMsg({ type: "err", text: verifyRes.data.message || "Payment verification failed." });
            }
          } catch (err) {
            setMsg({ type: "err", text: err?.response?.data?.message || "Payment verification failed." });
          } finally {
            setPaying(null);
          }
        },
        theme: { color: "#7c6cff" },
        modal: { ondismiss: () => setPaying(null) },
      };

      try {
        // 4. Create the checkout instance using the constructor from step 3.
        const rzp = new RazorpayCheckout(options);
        rzp.open();
      } catch (rzErr) {
        setPaying(null);
        setMsg({
          type: "err",
          text:
            rzErr?.message || "Unable to open payment gateway. Please check your Razorpay credentials.",
        });
      }
    } catch (err) {
      setPaying(null);
      setMsg({ type: "err", text: err?.response?.data?.message || "Could not create payment order." });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
      </div>
    );
  }

  const currentPlan = entitlement?.plan;

  return (
    <ErrorBoundary>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-10 md:py-12">
      <div className="vt-plan-content">
      {loadError && (
        <div className="vt-plan-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking-[-0.01em] text-[#ededf2]`}>
          Choose your plan
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          Upgrade to unlock unlimited AI word search and quiz generation.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-[22px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
        <h2 className={`${SERIF} mb-3 text-[24px] font-bold text-[#ededf2]`}>
          Your current plan
        </h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="vt-plan-mark">
              {currentPlan?.name === "paid" ? "PRO" : "FREE"}
            </div>
            <div>
              <div className={`${SERIF} text-[20px] font-bold text-[#ededf2]`}>
                {currentPlan?.displayName || "Free"}
              </div>
              <div className="text-[12px] text-[#9a9aae]">{currentPlan?.description || ""}</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {entitlement?.isUnlimited ? (
              <span className="rounded-full border border-[#5ee08a]/30 bg-[#5ee08a]/10 px-3 py-1 text-[11px] font-semibold text-[#5ee08a]">
                Active · Unlimited AI calls
              </span>
            ) : entitlement?.subscription ? (
              <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-[11px] font-semibold text-[#f59e0b]">
                Active · Expires {fmtDate(entitlement.subscription.expiryDate)}
              </span>
            ) : (
              <span className="rounded-full border border-[#7c6cff]/30 bg-[#7c6cff]/10 px-3 py-1 text-[11px] font-semibold text-[#7c6cff]">
                Free · {entitlement?.callsAllowed ?? 2} calls/day
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <h2 className={`${SERIF} mb-4 text-[24px] font-bold tracking-[-0.01em] text-[#ededf2]`}>
        Available plans
      </h2>
      <div className="plan-grid">
        {plans
          .filter(
            (p) =>
              !(entitlement?.isUnlimited || entitlement?.subscription)
                ? true
                : p.name !== "free"
          )
          .map((p) => {
          const active = isActiveSub(p);
          const unlim = isUnlimited(p);
          return (
            <div
              key={p._id}
              className={`rounded-[20px] border-[0.5px] p-5 flex flex-col transition-all ${
                active
                  ? "border-[#7c6cff]/50 bg-[#0f0f18]/50 shadow-[0_0_0_1px_rgba(124,108,255,0.15)]"
                  : "border-white/[0.07] bg-[#0f0f18] hover:border-[rgba(124,108,255,0.28)] hover:-translate-y-1"
              }`}
            >
              {active && (
                <div className="mb-3 flex items-center gap-2 px-2 py-0.5 rounded-full border border-[#7c6cff]/30 bg-[#7c6cff]/10 text-[10px] font-semibold text-[#b6abff]">
                  Current plan
                </div>
              )}
              <div className={`${SERIF} mb-2 text-[22px] font-bold text-[#ededf2]`}>
                {p.displayName}
              </div>
              <div className="mb-2 text-[13px] text-[#9a9aae] leading-relaxed">
                {p.description || ""}
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className={`${SERIF} text-[40px] font-extrabold text-[#ededf2]`}>
                    {p.price === 0 ? "Free" : `$${p.price}`}
                  </span>
                  {p.price > 0 && <span className="text-[14px] text-[#9a9aae]">/mo</span>}
                </div>
                <div className="mt-1 text-[11.5px] text-[#6a6a7c]">
                  {unlim ? "Unlimited AI calls" : `${p.aiCalls} AI calls per day`}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-[#5ee08a]">✓</span>
                  <span className="text-[12.5px] text-[#9a9aae]">
                    {unlim ? "Unlimited AI word search" : "AI word search (daily limit)"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-[#5ee08a]">✓</span>
                  <span className="text-[12.5px] text-[#9a9aae]">
                    {unlim ? "Unlimited quiz generation" : "Quiz generation (daily limit)"}
                  </span>
                </div>
                {p.durationDays && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-[#5ee08a]">✓</span>
                    <span className="text-[12.5px] text-[#9a9aae]">
                      Valid for {p.durationDays} days
                    </span>
                  </div>
                )}
              </div>

              {active ? (
                <button
                  disabled
                  className="w-full rounded-[12px] bg-[#7c6cff] py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Active plan
                </button>
              ) : p.name === "paid" ? (
                <button
                  onClick={() => subscribe(p)}
                  disabled={paying === p._id}
                  className="w-full rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] disabled:opacity-60"
                >
                  {paying === p._id ? "Processing…" : `Subscribe $${p.price}/mo`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <Link
        to="/subscription/cancel"
        className="block text-center text-[11px] text-[#7c6cff] underline underline-offset-4 hover:text-[#b6abff]"
      >
        Cancellation &amp; refund policy
      </Link>

      {user?.role === "admin" || user?.role === "super_admin" ? (
        <details className="vt-plan-admin-tools">
          <summary>Grant paid access (Admin)</summary>
          <div className="vt-plan-admin-content">
            <p className="mb-5 text-[#9a9aae]">
              Manually grant paid access to a user by email. The email must belong to a
              verified user.
            </p>
            <form onSubmit={handleGrant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">
                  User email
                </label>
                <input
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none focus:border-[rgba(124,108,255,0.55)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  className="w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none focus:border-[rgba(124,108,255,0.55)]"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={granting}
                  className="w-full rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] disabled:opacity-60"
                >
                  {granting ? "Granting…" : "Grant access"}
                </button>
              </div>
            </form>
            {msg && (
              <div
                className={`mt-5 rounded-[10px] border-[0.5px] px-3.5 py-2.5 text-[13px] ${
                  msg.type === "ok"
                    ? "border-[rgba(94,224,138,0.3)] bg-[rgba(94,224,138,0.1)] text-[#5ee08a]"
                    : "border-[rgba(255,123,123,0.25)] bg-[rgba(255,123,123,0.1)] text-[#ff7b7b]"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </details>
      ) : null}
      </div>
      </main>
    </ErrorBoundary>
  );
}