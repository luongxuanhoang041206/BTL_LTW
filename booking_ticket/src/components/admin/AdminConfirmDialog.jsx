import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminConfirmContext } from "./AdminConfirmContext";

export function AdminConfirmDialogProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const dialogRef = useRef(null);
  const activeRequest = requests[0];

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequests((current) => [...current, { ...options, resolve }]);
  }), []);

  const settle = (confirmed) => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    activeRequest?.resolve(confirmed);
    setRequests((current) => current.slice(1));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeRequest && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [activeRequest]);

  return (
    <AdminConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="admin-confirm-dialog"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-message"
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
      >
        {activeRequest && (
          <>
            <div className="admin-confirm-icon" aria-hidden="true">
              <AlertTriangle size={21} />
            </div>
            <h2 id="admin-confirm-title">{activeRequest.title}</h2>
            <p id="admin-confirm-message">{activeRequest.message}</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-confirm-cancel" autoFocus onClick={() => settle(false)}>
                Hủy
              </button>
              <button
                type="button"
                className={`admin-confirm-submit${activeRequest.variant === "danger" ? " is-danger" : ""}`}
                onClick={() => settle(true)}
              >
                {activeRequest.confirmLabel || "Xác nhận"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </AdminConfirmContext.Provider>
  );
}
