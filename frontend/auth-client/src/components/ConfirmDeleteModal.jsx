export default function ConfirmDeleteModal({
  isOpen,
  title = "Delete Item",
  message = "Are you sure you want to delete this item?",
  onCancel,
  onClose,
  onConfirm,
  loading = false,
}) {
  if (!isOpen) return null;
  const close = onCancel || onClose;

  return (
    <div className="vt-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) close?.();
    }}>
      <div className="vt-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
        <h2 className="text-xl font-semibold text-white">
          <span id="delete-modal-title">{title}</span>
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[#9a9aae]">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={close}
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