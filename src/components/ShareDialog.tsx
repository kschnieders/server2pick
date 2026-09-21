import { useEffect, useRef, useState } from "react";
import {
  readText,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";
import { useT } from "../i18n";
import { BACKDROP_IN, CARD_IN } from "../lib/overlay-animation";

/**
 * One shape for all three buttons. The width is fixed rather than fitted to the
 * label, because "Kopieren", "Einfügen" and "Übernehmen" are three different
 * lengths — and in Russian three quite different ones — so sizing to content
 * would leave the column ragged in every language.
 */
const BUTTON =
  "w-28 rounded-md px-3 py-1.5 text-center text-xs transition-colors disabled:opacity-40";

type Props = {
  /** `null` while the code is still being built. */
  code: string | null;
  onImport: (code: string) => Promise<boolean>;
  onClose: () => void;
};

export function ShareDialog({ code, onImport, onClose }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "bad" | "done">("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    if (!code) return;
    try {
      await writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fall back to letting the user copy the selection by hand.
      inputRef.current?.focus();
    }
  };

  const paste = async () => {
    try {
      const text = await readText();
      if (text) setInput(text);
    } catch {
      // Clipboard unavailable; typing still works.
    }
  };

  const doImport = async () => {
    const ok = await onImport(input);
    setStatus(ok ? "done" : "bad");
    if (ok) setInput("");
  };

  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center bg-ink-950/80 backdrop-blur-sm"
      style={BACKDROP_IN}
      onClick={onClose}
    >
      <div
        className="w-[28rem] max-w-[90vw] rounded-xl border border-ink-800 bg-ink-900 p-4 shadow-2xl shadow-black/60"
        style={CARD_IN}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("share.title")}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-1.5 text-ink-600 transition-colors hover:text-ink-100"
          >
            ✕
          </button>
        </header>

        <p className="mb-3 text-[11px] leading-relaxed text-ink-400">
          {t("share.hint")}
        </p>

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-600">
          {t("share.exportLabel")}
        </label>
        <div className="mb-4 flex gap-1.5">
          <textarea
            readOnly
            value={code ?? ""}
            rows={2}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 resize-none rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-ink-300 outline-none select-text"
          />
          {/* Same column shape as the import side below, so all three buttons
              line up at one width and one height. */}
          <div className="flex shrink-0 flex-col gap-1">
            <button
              onClick={copy}
              disabled={!code}
              className={BUTTON + " bg-amber-glow font-semibold text-ink-950 hover:bg-amber-glow/90"}
            >
              {copied ? t("share.copied") : t("share.copy")}
            </button>
          </div>
        </div>

        <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-600">
          {t("share.importLabel")}
        </label>
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            rows={2}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus("idle");
            }}
            placeholder="S2P2-…"
            className="min-w-0 flex-1 resize-none rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-ink-100 outline-none transition-colors select-text placeholder:text-ink-600 focus:border-amber-glow/60"
          />
          <div className="flex shrink-0 flex-col gap-1">
            <button
              onClick={paste}
              className={BUTTON + " border border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100"}
            >
              {t("share.paste")}
            </button>
            <button
              onClick={doImport}
              disabled={!input.trim()}
              className={BUTTON + " bg-ink-700 text-ink-100 hover:bg-ink-600"}
            >
              {t("share.apply")}
            </button>
          </div>
        </div>

        {status !== "idle" && (
          <p
            className={`mt-2 text-[11px] ${
              status === "bad" ? "text-rose-glow" : "text-teal-glow"
            }`}
          >
            {t(status === "bad" ? "share.invalid" : "share.imported")}
          </p>
        )}
      </div>
    </div>
  );
}
