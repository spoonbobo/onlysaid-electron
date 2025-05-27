import { useToastStore, ToastType } from "@/renderer/stores/Notification/ToastStore";

export const toast = {
  success: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, "success", duration);
  },
  error: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, "error", duration);
  },
  info: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, "info", duration);
  },
  warning: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, "warning", duration);
  },
};