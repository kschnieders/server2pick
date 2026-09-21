import { useEffect, useState } from "react";
import { resolveResource } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { useT, type TranslationKey } from "../i18n";
import { BACKDROP_IN, CARD_IN } from "../lib/overlay-animation";

type Props = {
  onClose: () => void;
};

const TABS = ["guide", "licenses"] as const;
type Tab = (typeof TABS)[number];

/** The MIT text itself, so the licence is readable without leaving the app. */
const MIT = `MIT License

Copyright (c) 2026 Kay Schnieders

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink-800 pt-3">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-glow">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Numbered so the order reads as an order, not a list of options. */
function Steps({ keys }: { keys: TranslationKey[] }) {
  const t = useT();
  return (
    <ol className="flex flex-col gap-1.5">
      {keys.map((key, i) => (
        <li key={key} className="flex gap-2 text-xs leading-relaxed text-ink-300">
          <span className="mt-px shrink-0 font-mono text-[11px] text-ink-600">
            {i + 1}.
          </span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

function Notes({ keys }: { keys: TranslationKey[] }) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-1.5">
      {keys.map((key) => (
        <li key={key} className="flex gap-2 text-xs leading-relaxed text-ink-300">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-600" />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The short manual. Everything here is something the interface cannot say on
 * its own: what a relay location is, and the four ways a blocklist can look
 * applied while doing nothing.
 */
export function InfoDialog({ onClose }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("guide");
  /** Set only after a failed attempt, so the hint appears when it is earned. */
  const [openFailed, setOpenFailed] = useState(false);

  /**
   * The third-party notices are 130 kB of licence text — shipped beside the
   * executable rather than bundled into the interface, and handed to whatever
   * the system uses for text files.
   */
  const openNotices = async () => {
    try {
      setOpenFailed(false);
      await openPath(await resolveResource("THIRD-PARTY-LICENSES.md"));
    } catch {
      setOpenFailed(true);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm"
      style={BACKDROP_IN}
      onClick={onClose}
    >
      {/* Fixed frame, scrolling content: the two tabs differ in length, and a
          card that resized under the pointer made switching feel unsteady. */}
      <div
        className="flex h-[34rem] max-h-[85vh] w-[32rem] max-w-[92vw] flex-col rounded-xl border border-ink-800 bg-ink-900 p-5 shadow-2xl shadow-black/60"
        style={CARD_IN}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-semibold">{t("info.heading")}</h2>
          <button
            onClick={onClose}
            aria-label={t("info.close")}
            className="rounded-md px-1.5 text-ink-600 transition-colors hover:text-ink-100"
          >
            ✕
          </button>
        </header>

        <nav className="mb-4 flex shrink-0 gap-1 border-b border-ink-800">
          {TABS.map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`-mb-px border-b-2 px-2.5 py-1.5 text-xs transition-colors ${
                tab === name
                  ? "border-amber-glow text-ink-100"
                  : "border-transparent text-ink-400 hover:text-ink-100"
              }`}
            >
              {t(`info.tab.${name}` as TranslationKey)}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div hidden={tab !== "licenses"}>
          <pre className="mb-4 rounded-lg bg-ink-950 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-ink-400 select-text">
            {MIT}
          </pre>

          <Section title={t("info.thirdPartyTitle")}>
            <p className="mb-3 text-xs leading-relaxed text-ink-300">
              {t("info.thirdPartyBody")}
            </p>
            <button
              onClick={openNotices}
              className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-amber-glow/60 hover:text-amber-glow"
            >
              {t("info.thirdPartyOpen")}
            </button>
            {openFailed && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-glow">
                {t("info.thirdPartyFailed")}
              </p>
            )}
          </Section>
        </div>

        <div hidden={tab !== "guide"}>
        <p className="mb-4 text-xs leading-relaxed text-ink-300">
          {t("info.what")}
        </p>

        <div className="flex flex-col gap-4">
          <Section title={t("info.stepsTitle")}>
            <Steps
              keys={["info.step1", "info.step2", "info.step3", "info.step4"]}
            />
          </Section>

          <Section title={t("info.notesTitle")}>
            <Notes
              keys={[
                "info.note1",
                "info.note2",
                "info.note3",
                "info.note4",
                "info.note5",
              ]}
            />
          </Section>

          <Section title={t("info.shareTitle")}>
            <p className="text-xs leading-relaxed text-ink-300">
              {t("info.shareBody")}
            </p>
          </Section>
        </div>
        </div>
        </div>

        <p className="mt-4 shrink-0 border-t border-ink-800 pt-3 text-[11px] leading-relaxed text-ink-600">
          {t("info.disclaimer")}
        </p>
      </div>
    </div>
  );
}
