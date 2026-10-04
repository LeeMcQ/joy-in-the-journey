import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Android app: bundled fonts replace the Google Fonts <link> (removed from
// index.html by the android-app-build plugin in vite.config.ts), so nothing but
// AI needs the network. The web build drops this branch and the fonts.
if (__ANDROID_APP__) void import("./android-fonts.css");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
