import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  autoHideDuration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, autoHideDuration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (message, type, autoHideDuration = 5000) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: Date.now().toString(),
          message,
          type,
          autoHideDuration,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));