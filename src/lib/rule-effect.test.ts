import { ruleEffect } from "./rule-effect";

/** 20:01 — the moment the rules were written, in the tests below. */
const APPLIED = 1_700_000_000_000;
const MINUTE = 60_000;

const game = (patch: any = {}): any => ({
  id: "deadlock",
  name: "Deadlock",
  short: "DL",
  appid: 1422450,
  installed: true,
  path: "D:\\deadlock.exe",
  running: false,
  runningSince: null,
  exeNames: ["deadlock.exe"],
  ...patch,
});

const sys = (appliedAt: Record<string, number> = { deadlock: APPLIED }): any => ({
  elevated: true,
  games: [],
  rules: [],
  appliedAt,
  error: null,
});

let fails = 0;
const check = (name: string, cond: boolean) => {
  console.log((cond ? "  ok   " : "  FAIL ") + name);
  if (!cond) fails++;
};

check("kein Spiel", ruleEffect(null, sys(), 28) === "none");
check("keine Regeln", ruleEffect(game(), sys(), 0) === "none");

check(
  "Spiel aus, Regeln stehen",
  ruleEffect(game(), sys(), 28) === "idle",
);

check(
  "vor den Regeln gestartet",
  ruleEffect(
    game({ running: true, runningSince: APPLIED - 46 * MINUTE }),
    sys(),
    28,
  ) === "stale",
);

check(
  "nach den Regeln gestartet",
  ruleEffect(
    game({ running: true, runningSince: APPLIED + MINUTE }),
    sys(),
    28,
  ) === "live",
);

// A game that came up in the same second still counts as covered: the rules
// were in the firewall before its first packet.
check(
  "gleichzeitig gestartet zaehlt als abgedeckt",
  ruleEffect(game({ running: true, runningSince: APPLIED }), sys(), 28) ===
    "live",
);

check(
  "Startzeit unlesbar",
  ruleEffect(game({ running: true, runningSince: null }), sys(), 28) ===
    "unknown",
);

check(
  "Regeln aus aelterer Version ohne Zeitstempel",
  ruleEffect(
    game({ running: true, runningSince: APPLIED }),
    sys({}),
    28,
  ) === "unknown",
);

check(
  "anderes Spiel hat Zeitstempel",
  ruleEffect(
    game({ running: true, runningSince: APPLIED }),
    sys({ cs2: APPLIED }),
    28,
  ) === "unknown",
);

console.log(fails === 0 ? "\nALLE TESTS OK" : `\n${fails} FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
