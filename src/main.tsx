import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// WebView2 otherwise answers a right-click with its own menu — save as, print,
// reload, Edge's password manager — none of which mean anything here, and
// reloading would throw away the ping history the list is sorted by.
//
// Text fields are not exempt: individual entries cannot be removed, the menu
// belongs to Edge, and the offending ones show up precisely there. Ctrl+C/V
// still work, and the share dialog has its own copy and paste buttons.
//
// Left alone in a dev build, where "Inspect element" is the point.
if (!import.meta.env.DEV) {
  window.addEventListener("contextmenu", (event) => event.preventDefault());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
