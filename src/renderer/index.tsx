import React from "react";
import ReactDOM from "react-dom/client";
import App from './App';
import '@fontsource/roboto/400.css';
import './App.css';

import { ThemeContextProvider } from "../providers/MaterialTheme";
import { SSEProvider } from "../providers/SSEProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { IntlProvider } from "../providers/IntlProvider";

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
