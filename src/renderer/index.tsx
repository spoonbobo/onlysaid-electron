import React from "react";
import ReactDOM from "react-dom/client";
import App from './App';

// Import Inter font first, before any components
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './App.css';

import { ThemeContextProvider } from "@/renderer/providers/MaterialTheme";
import { SSEProvider } from "@/renderer/providers/SSEProvider";
import { ToastProvider } from "@/renderer/providers/ToastProvider";
import { IntlProvider } from "@/renderer/providers/IntlProvider";

// Preload Inter font to prevent FOUT (Flash of Unstyled Text)
const preloadFont = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = '/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

// Call preload immediately
preloadFont();

const container = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <IntlProvider>
      <ThemeContextProvider>
        <SSEProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SSEProvider>
      </ThemeContextProvider>
    </IntlProvider>
  </React.StrictMode>,
);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
