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

// Remove the manual font preloading since @fontsource imports handle it
// The original preloadFont function was trying to access a non-existent path
// and the font loading is already optimized through the CSS imports above

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
