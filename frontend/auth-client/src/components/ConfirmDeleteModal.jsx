export default function ConfirmDeleteModal({
  isOpen,
  title = "Delete Item",
  message = "Are you sure you want to delete this item?",
  onCancel,
  onConfirm,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f18] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[#9a9aae]">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#9a9aae] transition hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}