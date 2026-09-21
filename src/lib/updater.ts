import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * Checks GitHub for a newer release and installs it on request.
 *
 * The check is deliberately quiet: a failed one — no network, GitHub down, a
 * release without updater artifacts — leaves the app exactly as it was. Nobody
 * opens a server picker to hear about its update server, so only a *found*
 * update ever reaches the screen.
 */

export type UpdateState =
  | { status: "idle" }
  | { status: "available"; version: string }
  /** `percent` stays null until the download reports a content length. */
  | { status: "downloading"; version: string; percent: number | null }
  | { status: "ready"; version: string }
  | { status: "failed"; version: string };

export function useUpdater(enabled: boolean) {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const found = await check();
        if (!found || cancelled) return;
        setUpdate(found);
        setState({ status: "available", version: found.version });
      } catch {
        // Silence is the right answer here — see the note above.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const install = useCallback(async () => {
    if (!update) return;
    const version = update.version;
    setState({ status: "downloading", version, percent: null });

    try {
      let total = 0;
      let received = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            received += event.data.chunkLength;
            setState({
              status: "downloading",
              version,
              percent: total > 0 ? Math.min(100, (received / total) * 100) : null,
            });
            break;
          case "Finished":
            setState({ status: "ready", version });
            break;
        }
      });

      // On Windows the installer closes the app itself, so this line is often
      // never reached — it is here for the case where it is.
      await relaunch();
    } catch {
      setState({ status: "failed", version });
    }
  }, [update]);

  return { state, install };
}
