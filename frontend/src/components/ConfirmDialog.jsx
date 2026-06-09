import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "danger", // 'danger' | 'warning' | 'info'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container confirm-container glass-panel">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle color={type === "danger" ? "var(--danger)" : "var(--warning)"} size={20} />
            <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: "1.5" }}>
            {message}
          </p>
        </div>
        <div className="modal-footer" style={{ borderTop: "none", paddingTop: 0 }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${type === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
