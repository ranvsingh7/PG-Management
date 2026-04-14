"use client";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isConfirming = false,
  onConfirm,
  onCancel,
  tone = "danger",
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClassName =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-[var(--color-sky)] hover:bg-sky-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
        <h3 className="text-xl font-bold text-[var(--color-text-title)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`cursor-pointer inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmButtonClassName}`}
          >
            {isConfirming ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
