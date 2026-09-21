import type { CSSProperties } from "react";

/**
 * The shared entrance for every modal: the backdrop settles first, then the
 * card rises into it.
 *
 * Kept in one place rather than repeated per dialog — three copies of the same
 * timings drift apart the first time one of them is tuned, and a modal that
 * opens differently from its neighbours is the kind of difference people feel
 * without being able to name.
 *
 * The keyframes live in index.css, which is what lets the reduced-motion rule
 * there switch them off.
 */
export const BACKDROP_IN: CSSProperties = {
  animation: "overlay-backdrop-in 380ms ease-out both",
};

export const CARD_IN: CSSProperties = {
  animation: "overlay-card-in 420ms cubic-bezier(0.16, 0.8, 0.24, 1) 80ms both",
};
