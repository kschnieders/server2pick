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

async function main() {
  const code = await encodeShare(settings, { game: "deadlock", blocked: ["syd", "gru"] });
  console.log("code:", code.slice(0, 60) + "… (" + code.length + " Zeichen)");

  check("Praefix", code.startsWith("S2P2-"));
  check("URL-sicher", !/[+/=]/.test(code));

  const decoded = (await decodeShare(code))!;
  check("dekodiert", decoded !== null);
  check("aktuelle Auswahl schlaegt gespeicherte",
    JSON.stringify(decoded.deadlock.blocked) === JSON.stringify(["syd", "gru"]));
  check("Profile ueberleben", decoded.deadlock.presets[0].name === "Nur EU");
  check("zweites Spiel dabei", decoded.cs2.blocked[0] === "pekm");
  check("kein Pfad im Code", !JSON.stringify(decoded).includes("SteamLibrary"));

  // Every delimiter of the payload format, in a name a user may well pick.
  const tricky: any = {
    ...settings,
    games: {
      deadlock: {
        gamePath: null,
        lastBlocked: ["fra"],
        presets: [
          { name: "EU|Asien~mix:test.1 100%", blocked: ["iad"] },
          { name: "", blocked: ["ord"] },
        ],
      },
    },
  };
  const trickyDecoded = (await decodeShare(await encodeShare(tricky)))!;
  check("Sonderzeichen im Profilnamen",
    trickyDecoded.deadlock.presets[0]?.name === "EU|Asien~mix:test.1 100%");
  check("leerer Profilname fliegt raus", trickyDecoded.deadlock.presets.length === 1);

  // Profiles without blocked servers, and games without profiles, must survive.
  const edge: any = {
    ...settings,
    games: { deadlock: { gamePath: null, lastBlocked: [], presets: [{ name: "Alles an", blocked: [] }] } },
  };
  const edgeDecoded = (await decodeShare(await encodeShare(edge)))!;
  check("leere Auswahl", edgeDecoded.deadlock.blocked.length === 0);
  check("Profil ohne Sperren", edgeDecoded.deadlock.presets[0]?.name === "Alles an");

  // A code written by the previous version has to keep importing.
  const legacy =
    "S2P1-" +
    btoa(JSON.stringify({ v: 1, g: { deadlock: { b: ["syd"], p: [{ n: "Alt", b: ["iad"] }] } } }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const old = (await decodeShare(legacy))!;
  check("alter S2P1-Code importiert", old?.deadlock.blocked[0] === "syd");
  check("alte Profile importiert", old?.deadlock.presets[0].name === "Alt");

  const merged = applyShare(
    { ...settings, games: { deadlock: { gamePath: "C:\eigener\pfad.exe", presets: [{ name: "Meins", blocked: ["lax"] }], lastBlocked: [] } } } as any,
    decoded,
  );
  check("fremder Pfad bleibt lokal", merged.games.deadlock.gamePath === "C:\eigener\pfad.exe");
  check("eigenes Profil bleibt", merged.games.deadlock.presets.some((p: any) => p.name === "Meins"));
  check("fremdes Profil kommt dazu", merged.games.deadlock.presets.some((p: any) => p.name === "Nur EU"));
  check("Auswahl uebernommen", JSON.stringify(merged.games.deadlock.lastBlocked) === JSON.stringify(["syd", "gru"]));

  check("Muell abgelehnt", (await decodeShare("hallo")) === null);
  check("falsches Praefix abgelehnt", (await decodeShare("S2P9-abc")) === null);
  check("kaputte Base64 abgelehnt", (await decodeShare("S2P1-!!!!")) === null);
  check("undeflatierbarer Rumpf abgelehnt", (await decodeShare("S2P2-aaaa")) === null);
  check("leer abgelehnt", (await decodeShare("")) === null);

  // The point of the exercise: a full setup has to stay pasteable.
  const pops = ["ams","atl","bom2","dfw","dxb","eze","fra","gru","gum","hkg","iad","jnb","lax","lhr","lim","maa2","mad","ord","par","scl","sea","seo","sgp","sto","sto2","syd","tyo","vie","waw"];
  const big: any = {
    ...settings,
    games: {
      deadlock: { gamePath: null, lastBlocked: pops.slice(0, 20), presets: [
        { name: "Nur EU", blocked: pops.slice(0, 22) },
        { name: "Asien raus", blocked: ["hkg", "seo", "sgp", "tyo", "bom2", "maa2"] },
      ]},
      cs2: { gamePath: null, lastBlocked: pops.slice(0, 18), presets: [
        { name: "Ranked", blocked: pops.slice(3, 25) },
      ]},
    },
  };
  const bigCode = await encodeShare(big);
  console.log("  voller Aufbau:", bigCode.length, "Zeichen");
  check("voller Aufbau bleibt unter 300 Zeichen", bigCode.length < 300);
  const bigDecoded = (await decodeShare(bigCode))!;
  check("voller Aufbau dekodiert verlustfrei",
    JSON.stringify(bigDecoded.deadlock.presets) === JSON.stringify(big.games.deadlock.presets) &&
    JSON.stringify(bigDecoded.cs2.blocked) === JSON.stringify(big.games.cs2.lastBlocked));

  console.log(fails === 0 ? "\nALLE TESTS OK" : `\n${fails} FEHLER`);
  process.exit(fails === 0 ? 0 : 1);
}

main();
