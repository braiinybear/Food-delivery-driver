import { create } from "zustand";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
}

export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  type: AlertType;
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertType
  ) => void;
  hide: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: "",
  message: "",
  buttons: [],
  type: "info",
  show: (title, message = "", buttons = [{ text: "OK" }], type) => {
    // Auto-detect type from title if not explicitly provided
    const detectedType =
      type ??
      (title.toLowerCase().includes("success")
        ? "success"
        : title.toLowerCase().includes("error") ||
            title.toLowerCase().includes("failed")
          ? "error"
          : title.toLowerCase().includes("warning") ||
              title.toLowerCase().includes("cancel")
            ? "warning"
            : title.toLowerCase().includes("confirm") ||
                title.toLowerCase().includes("delete") ||
                title.toLowerCase().includes("logout") ||
                title.toLowerCase().includes("remove")
              ? "confirm"
              : "info");

    set({ visible: true, title, message, buttons, type: detectedType });
  },
  hide: () =>
    set({
      visible: false,
      title: "",
      message: "",
      buttons: [],
      type: "info",
    }),
}));

/**
 * Drop-in replacement for `Alert.alert(title, message?, buttons?)`.
 * Can be called from anywhere — no hooks needed.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType
): void {
  useAlertStore.getState().show(title, message, buttons, type);
}
