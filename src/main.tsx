import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// WebView2 otherwise answers a right-click with its own menu — save as, print,
// reload — none of which mean anything here, and reloading would throw away the
// ping history the list is sorted by. Text fields keep theirs: cut, copy and
// paste are the one case where that menu is worth having.
//
// Left alone in a dev build, where "Inspect element" is the point.
if (!import.meta.env.DEV) {
  window.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea")) return;
    event.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
