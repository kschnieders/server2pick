import { applyShare, decodeShare, encodeShare } from "./share-code";

const settings: any = {
  language: "de",
  lastGame: "deadlock",
  scopeToGame: true,
  pingIntervalMs: 4000,
  games: {
    deadlock: {
      gamePath: "D:\SteamLibrary\...\deadlock.exe",
      presets: [{ name: "Nur EU", blocked: ["iad", "ord"] }],
      lastBlocked: ["iad", "ord", "atl"],
    },
    cs2: { gamePath: null, presets: [], lastBlocked: ["pekm"] },
  },
};

let fails = 0;
const check = (name: string, cond: boolean) => {
  console.log((cond ? "  ok   " : "  FAIL ") + name);
  if (!cond) fails++;
};

const code = encodeShare(settings, { game: "deadlock", blocked: ["syd", "gru"] });
console.log("code:", code.slice(0, 60) + "… (" + code.length + " Zeichen)");

check("Praefix", code.startsWith("S2P1-"));
check("URL-sicher", !/[+/=]/.test(code));

const decoded = decodeShare(code)!;
check("dekodiert", decoded !== null);
check("aktuelle Auswahl schlaegt gespeicherte",
  JSON.stringify(decoded.deadlock.blocked) === JSON.stringify(["syd", "gru"]));
check("Profile ueberleben", decoded.deadlock.presets[0].name === "Nur EU");
check("zweites Spiel dabei", decoded.cs2.blocked[0] === "pekm");
check("kein Pfad im Code", !code.includes("U3RlYW0") && !JSON.stringify(decoded).includes("SteamLibrary"));

const merged = applyShare(
  { ...settings, games: { deadlock: { gamePath: "C:\eigener\pfad.exe", presets: [{ name: "Meins", blocked: ["lax"] }], lastBlocked: [] } } } as any,
  decoded,
);
check("fremder Pfad bleibt lokal", merged.games.deadlock.gamePath === "C:\eigener\pfad.exe");
check("eigenes Profil bleibt", merged.games.deadlock.presets.some((p: any) => p.name === "Meins"));
check("fremdes Profil kommt dazu", merged.games.deadlock.presets.some((p: any) => p.name === "Nur EU"));
check("Auswahl uebernommen", JSON.stringify(merged.games.deadlock.lastBlocked) === JSON.stringify(["syd", "gru"]));

check("Muell abgelehnt", decodeShare("hallo") === null);
check("falsches Praefix abgelehnt", decodeShare("S2P9-abc") === null);
check("kaputte Base64 abgelehnt", decodeShare("S2P1-!!!!") === null);
check("leer abgelehnt", decodeShare("") === null);

console.log(fails === 0 ? "\nALLE TESTS OK" : `\n${fails} FEHLER`);
process.exit(fails === 0 ? 0 : 1);
