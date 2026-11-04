import { AlertTriangle } from "lucide-react";
import "./AdminConfirmModal.css";

function AdminConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  loadingLabel = "Deleting…",
  confirmVariant = "danger",
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="admin-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <section
        className="admin-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <div className="admin-confirm-icon"><AlertTriangle size={21} /></div>
        <h2 id="admin-confirm-title">{title}</h2>
        <p id="admin-confirm-description">{message}</p>
        <div className="admin-confirm-actions">
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`confirm-delete ${confirmVariant === "primary" ? "confirm-primary" : ""}`} onClick={onConfirm} disabled={loading}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminConfirmModal;
