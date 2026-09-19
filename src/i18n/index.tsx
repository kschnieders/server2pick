import { createContext, useCallback, useContext, useMemo } from "react";
import { de, type Dictionary, type TranslationKey } from "./de";
import { en } from "./en";

/**
 * Adding a language takes two steps: copy `de.ts`, translate the values, then
 * add one line here. `Dictionary` is derived from the German file, so a missing
 * key is a type error rather than a blank label at runtime.
 */
export const LANGUAGES: { code: string; dict: Dictionary }[] = [
  { code: "de", dict: de },
  { code: "en", dict: en },
];

/** German is the source language and therefore the fallback for gaps. */
const FALLBACK = de;

export type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

function lookup(code: string): Dictionary {
  return LANGUAGES.find((l) => l.code === code)?.dict ?? FALLBACK;
}

/** Picks the closest shipped language for the browser/OS locale. */
export function detectLanguage(): string {
  const wanted = navigator.languages ?? [navigator.language];
  for (const tag of wanted) {
    const base = tag.toLowerCase().split("-")[0];
    const hit = LANGUAGES.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return "en";
}

export function languageName(code: string): string {
  return lookup(code)["lang.name"];
}

function interpolate(text: string, params?: Record<string, string | number>) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/** A translator outside of React context — for the component that owns the
 *  language state and therefore renders the provider itself. */
export function makeTranslate(language: string): Translate {
  const dict = lookup(language);
  return (key, params) => interpolate(dict[key] ?? FALLBACK[key] ?? key, params);
}

const TranslateContext = createContext<Translate>(((key) =>
  FALLBACK[key as TranslationKey] ?? key) as Translate);

export function I18nProvider({
  language,
  children,
}: {
  language: string;
  children: React.ReactNode;
}) {
  const dict = useMemo(() => lookup(language), [language]);

  const t = useCallback<Translate>(
    (key, params) => interpolate(dict[key] ?? FALLBACK[key] ?? key, params),
    [dict],
  );

  return (
    <TranslateContext.Provider value={t}>{children}</TranslateContext.Provider>
  );
}

export function useT(): Translate {
  return useContext(TranslateContext);
}

/**
 * Turns a backend error into readable text. Rust sends `CODE|detail`; the code
 * is translated and the detail kept, because the detail is what makes a bug
 * report useful.
 */
export function translateError(t: Translate, error: unknown): string {
  const raw = String(error);
  const [code, ...rest] = raw.split("|");
  const detail = rest.join("|").trim();
  const key = `error.${code}` as TranslationKey;
  const known = code.startsWith("E_") && key in de;

  if (!known) return raw;
  return detail ? `${t(key)} (${detail})` : t(key);
}

export type { TranslationKey, Dictionary };
