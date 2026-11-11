import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { savePlan, getAllPlansAdmin } from "../../api/subscriptions";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const INPUT =
  "w-full rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]";

const LABEL = "mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#6a6a7c]";

const BTN_PRIMARY =
  "rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,108,255,0.7)] transition-transform hover:-translate-y-px disabled:opacity-60";

const BTN_GHOST =
  "rounded-[12px] border-[0.5px] border-white/[0.07] bg-transparent px-5 py-3 text-sm font-medium text-[#9a9aae] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#b6abff]";

export default function AdminCreatePlan() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "paid",
    displayName: "",
    description: "",
    aiCalls: "unlimited",
    durationDays: "30",
    price: "0",
    currency: "USD",
    isActive: true,
    isPublic: true,
    sortOrder: "1",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = (k) => (e) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const handleToggle = (k) => () => {
    setForm((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    // Client-side validation
    if (!form.displayName?.trim()) {
      setMsg({ type: "err", text: "Display name is required." });
      setLoading(false);
      return;
    }

    try {
      const res = await savePlan({
        name: form.name,
        displayName: form.displayName.trim(),
        description: form.description.trim() || undefined,
        aiCalls: form.aiCalls === "unlimited" ? "unlimited" : Number(form.aiCalls),
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        price: form.price ? Number(form.price) : undefined,
        currency: form.currency,
        isActive: form.isActive,
        isPublic: form.isPublic,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      });
      if (res.data.success) {
        setMsg({ type: "ok", text: `Plan "${form.displayName.trim()}" created successfully.` });
        setTimeout(() => navigate("/admin/plans"), 1200);
      } else {
        setMsg({ type: "err", text: res.data.message || "Failed to create plan." });
      }
    } catch (err) {
      setMsg({ type: "err", text: err?.response?.data?.message || "Failed to create plan." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking[-0.01em] text-[#ededf2]`}>
            Create Plan
          </h1>
          <p className="mt-1 text-[#9a9aae]">
            Create a new subscription plan for VocabTrainer.
          </p>
        </div>
        <Link
          to="/admin/plans"
          className="cursor-pointer rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-5 py-3 text-sm font-medium text-[#b6abff] transition-all hover:border-[rgba(124,108,255,0.45)] hover:text-[#ededf2] hover:bg-white/[0.03]"
        >
          ← Back to Plans
        </Link>
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className={LABEL}>Plan Type *</label>
            <select
              value={form.name}
              onChange={handleChange("name")}
              className={INPUT}
            >
              <option value="paid">Paid</option>
              <option value="free">Free</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className={LABEL}>Display Name *</label>
            <input
              type="text"
              value={form.displayName}
              onChange={handleChange("displayName")}
              placeholder="e.g. Pro, Starter, Premium"
              className={INPUT}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className={LABEL}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange("description")}
              placeholder="e.g. Unlimited AI word search and quiz generation"
              className={INPUT}
            />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className={LABEL}>AI Calls Limit</label>
            <select
              value={form.aiCalls}
              onChange={handleChange("aiCalls")}
              className={INPUT}
            >
              <option value="unlimited">Unlimited</option>
              <option value="1">1 per day</option>
              <option value="2">2 per day</option>
              <option value="5">5 per day</option>
              <option value="10">10 per day</option>
              <option value="20">20 per day</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className={LABEL}>Duration (days)</label>
            <input
              type="number"
              value={form.durationDays}
              onChange={handleChange("durationDays")}
              placeholder="30"
              className={INPUT}
            />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className={LABEL}>Price ($)</label>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-[#ededf2]">$</span>
              <input
                type="number"
                value={form.price}
                onChange={handleChange("price")}
                placeholder="9.99"
                className="flex-1 rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none transition-all placeholder:text-[#6a6a7c] focus:border-[rgba(124,108,255,0.55)] focus:ring-2 focus:ring-[rgba(124,108,255,0.12)]"
              />
            </div>
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className={LABEL}>Currency</label>
            <select
              value={form.currency}
              onChange={handleChange("currency")}
              className={INPUT}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className={LABEL}>Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={handleChange("sortOrder")}
              placeholder="1"
              className={INPUT}
            />
          </div>

          <div className="col-span-1 md:col-span-1 pt-8">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={handleToggle("isActive")}
                className="rounded border-white/[0.07] bg-[#0f0f18] text-[#7c6cff] focus:ring-[#7c6cff]"
              />
              <label className="text-sm text-[#ededf2] cursor-pointer">Active</label>
            </div>
          </div>

          <div className="col-span-1 md:col-span-1 pt-8">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={handleToggle("isPublic")}
                className="rounded border-white/[0.07] bg-[#0f0f18] text-[#7c6cff] focus:ring-[#7c6cff]"
              />
              <label className="text-sm text-[#ededf2] cursor-pointer">Public (visible to users)</label>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3">
            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? "Creating…" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>

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