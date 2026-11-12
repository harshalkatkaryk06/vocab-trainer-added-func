import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { savePlan } from "../../api/subscriptions";
import { subscriptionQueryKeys, useAdminPlans } from "../../queries/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const planTypeColor = (name) =>
  name === "paid"
    ? "bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/20"
    : "bg-[#7c6cff]/10 text-[#7c6cff] border-[#7c6cff]/20";

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function AdminPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const plansQuery = useAdminPlans(user?.id);
  const plans = plansQuery.data?.data || [];
  const loading = plansQuery.isPending;
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState(null);

  const togglePlan = async (plan) => {
    setSaving(plan._id);
    try {
      const res = await savePlan({
        _id: plan._id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        aiCalls: plan.aiCalls,
        durationDays: plan.durationDays,
        price: plan.price,
        currency: plan.currency,
        isActive: !plan.isActive,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
      });
      if (res.data.success) {
        setMsg({
          type: "ok",
          text: `Plan ${!plan.isActive ? "activated" : "deactivated"}.`,
        });
        queryClient.setQueryData(
          subscriptionQueryKeys.adminPlans(user?.id),
          (current) => ({
            ...current,
            data: current.data.map((p) =>
              p._id === plan._id ? { ...p, isActive: !p.isActive } : p
            ),
          })
        );
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKeys.plans,
        });
      } else {
        setMsg({ type: "err", text: res.data.message || "Failed to update plan." });
      }
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "Failed to update plan." });
    } finally {
      setSaving(null);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking[-0.01em] text-[#ededf2]`}>
              Plans
            </h1>
            <p className="mt-1 text-[#9a9aae]">
              Manage subscription plans. Activate or deactivate plans to control availability.
            </p>
          </div>
          <Link
            to="/admin/plans/create"
            className="cursor-pointer rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px"
          >
            + Add New Plan
          </Link>
        </div>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Plan</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Type</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">AI Calls</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Price</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Duration</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Status</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {plans.map((p) => (
              <tr key={p._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="font-medium text-[#ededf2]">{p.displayName}</div>
                  <div className="text-[12px] text-[#9a9aae]">{p.description || "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${planTypeColor(p.name)}`}>
                    {p.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#9a9aae]">
                  {p.aiCalls === "unlimited" ? "Unlimited" : `${p.aiCalls} / day`}
                </td>
                <td className="px-6 py-4 text-[#9a9aae]">
                  ${p.price === 0 ? "Free" : `$${p.price} ${p.currency}`}
                </td>
                <td className="px-6 py-4 text-[#9a9aae]">
                  {p.durationDays ? `${p.durationDays} days` : "No expiration"}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    p.isActive
                      ? "bg-[#5ee08a]/10 text-[#5ee08a] border-[#5ee08a]/20"
                      : "bg-[#9a9aae]/10 text-[#9a9aae] border-[#9a9aae]/20"
                  }`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => togglePlan(p)}
                    disabled={saving === p._id}
                    className="cursor-pointer rounded px-3 py-1.5 text-[11px] font-medium transition-colors border border-white/[0.07] bg-transparent text-[#9a9aae] hover:text-[#b6abff] hover:bg-white/[0.03] disabled:opacity-50"
                  >
                    {saving === p._id ? "…" : p.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plans.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No plans found.</p>
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
