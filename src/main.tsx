import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

/* ── PWA update handler ──────────────────────────────── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content available — dynamic import to avoid loading toast module at startup
              import("./components/ui/Toast").then(({ showToast }) => {
                showToast("A new version is available", {
                  type: "info",
                  duration: 8000,
                  action: {
                    label: "Update",
                    onClick: () => window.location.reload(),
                  },
                });
              });
            }
          });
        });
      }
    } catch {
      // SW registration handled by vite-plugin-pwa
    }
  });
}
