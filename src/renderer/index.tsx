import React from "react";
import ReactDOM from "react-dom/client";
import App from './App';
import '@fontsource/poppins';
// import "@fontsource/space-mono"; // Defaults to weight 400
// import "@fontsource/space-mono/400.css"; // Specify weight
// import "@fontsource/space-mono/400-italic.css"; // Specify weight and style
// import '@fontsource-variable/inter';
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
