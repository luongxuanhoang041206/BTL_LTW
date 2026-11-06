import { useContext } from "react";
import { AdminConfirmContext } from "./AdminConfirmContext";

export function useAdminConfirm() {
  const confirm = useContext(AdminConfirmContext);
  if (!confirm) {
    throw new Error("useAdminConfirm must be used inside AdminConfirmDialogProvider");
  }
  return confirm;
}
