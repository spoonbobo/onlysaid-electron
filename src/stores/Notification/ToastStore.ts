import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  autoHideDuration?: number;
  progress?: number;
  showProgress?: boolean;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, autoHideDuration?: number) => string;
  updateToastProgress: (id: string, progress: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (message, type, autoHideDuration = 5000) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          message,
          type,
          autoHideDuration,
        },
      ],
    }));
    return id;
  },
  updateToastProgress: (id, progress) =>
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id
          ? {
            ...toast,
            progress,
            showProgress: true,
            autoHideDuration: progress === 100 ? 3000 : toast.autoHideDuration,
          }
          : toast
      ),
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));