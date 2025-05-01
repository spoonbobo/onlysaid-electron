import React from "react";
import { Snackbar, Alert, Stack } from "@mui/material";
import { useToastStore, ToastMessage } from "../stores/Notification/ToastStore";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToastStore();

  const handleClose = (id: string) => {
    removeToast(id);
  };

  return (
    <>
      {children}

      <Stack spacing={2} sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000 }}>
        {toasts.map((toast: ToastMessage) => (
          <Snackbar
            key={toast.id}
            open={true}
            autoHideDuration={toast.autoHideDuration}
            onClose={() => handleClose(toast.id)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            sx={{ position: "static", transform: "none" }}
          >
            <Alert
              onClose={() => handleClose(toast.id)}
              severity={toast.type}
              variant="filled"
              sx={{ width: "100%" }}
            >
              {toast.message}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </>
  );
}