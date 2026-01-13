// src/components/BurnConsoleSheet.js
import React, { useEffect } from "react";
import PropTypes from "prop-types";

export default function BurnConsoleSheet({
  open,
  onClose,
  title = "Incinerators",
  children,
}) {
  // Prevent background scroll while sheet is open (mobile especially)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`burnsheet-root ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <button
        className="burnsheet-backdrop"
        onClick={onClose}
        aria-label="Close incinerator panel"
        tabIndex={open ? 0 : -1}
        style={{ pointerEvents: open ? "auto" : "none" }}
      />

      <div
        className="burnsheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="burnsheet-grabber" />

        <div className="burnsheet-header">
          <div className="burnsheet-title">{title}</div>
          <button
            className="burnsheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ✅ IMPORTANT: this is the ONLY scroll container */}
        <div className="burnsheet-content">{children}</div>
      </div>
    </div>
  );
}

BurnConsoleSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
};

