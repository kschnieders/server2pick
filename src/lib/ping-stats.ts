import type { PingResult } from "../api";

/** Rolling window per POP — long enough for a stable jitter reading, short
 *  enough that the numbers still react when the route actually changes. */
const WINDOW = 12;

export type Sample = number | null;

export type PopStats = {
  /** Latest round trip, or `null` when the last probe timed out. */
  last: number | null;
  best: number | null;
  avg: number | null;
  /** Mean absolute difference between consecutive successful samples. */
  jitter: number | null;
  /** Packet loss across the window, 0–1. */
  loss: number;
  samples: Sample[];
};

export type History = Record<string, Sample[]>;

export function pushRound(history: History, results: PingResult[]): History {
  const next: History = { ...history };
  for (const r of results) {
    const prev = next[r.pop] ?? [];
    next[r.pop] = [...prev, r.rtt].slice(-WINDOW);
  }
  return next;
}

export function statsFor(samples: Sample[] | undefined): PopStats | null {
  if (!samples || samples.length === 0) return null;

  const ok = samples.filter((s): s is number => s !== null);
  const loss = 1 - ok.length / samples.length;

  if (ok.length === 0) {
    return { last: null, best: null, avg: null, jitter: null, loss: 1, samples };
  }

  let jitter: number | null = null;
  if (ok.length > 1) {
    let sum = 0;
    for (let i = 1; i < ok.length; i++) sum += Math.abs(ok[i] - ok[i - 1]);
    jitter = sum / (ok.length - 1);
  }

  return {
    last: samples[samples.length - 1],
    best: Math.min(...ok),
    avg: ok.reduce((a, b) => a + b, 0) / ok.length,
    jitter,
    loss,
    samples,
  };
}

export type Quality = "great" | "good" | "fair" | "poor" | "dead";

export function quality(ms: number | null | undefined): Quality {
  if (ms === null || ms === undefined) return "dead";
  if (ms < 35) return "great";
  if (ms < 70) return "good";
  if (ms < 120) return "fair";
  return "poor";
}

export const QUALITY_COLOR: Record<Quality, string> = {
  great: "#3ec7a8",
  good: "#8bc34a",
  fair: "#e8a33d",
  poor: "#e5615e",
  dead: "#4a525c",
};

/** Maps latency onto a 0–1 bar length, saturating at 250 ms. */
export function qualityFraction(ms: number | null | undefined): number {
  if (ms === null || ms === undefined) return 0;
  return Math.max(0.04, 1 - Math.min(ms, 250) / 250);
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return `${Math.round(ms)}`;
}
