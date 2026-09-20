/**
 * German — the source language. Every other dictionary is typed against this
 * one, so adding a key here makes TypeScript point at every translation that
 * is still missing it.
 *
 * `{name}` placeholders are filled in by `t(key, { name })`.
 */
export const de = {
  "lang.name": "Deutsch",

  "app.name": "server2pick",
  "app.tagline": "Serverauswahl für Steam-Datagram-Relay-Spiele",

  "splash.step.0": "Spiele und Firewall-Regeln prüfen",
  "splash.step.1": "Relay-Liste von Valve laden",
  "splash.step.2": "Standorte anpingen",
  "splash.step.3": "Bereit",

  "picker.title": "Spiel wählen",
  "picker.subtitle":
    "Jedes Spiel behält eine eigene Sperrliste — sie gelten gleichzeitig.",
  "picker.running": "läuft",
  "picker.blocked": "{count} gesperrt",
  "picker.notFound": "nicht gefunden — Pfad später manuell wählbar",
  "picker.cancel": "Abbrechen",
  "picker.language": "Sprache",

  "header.switchGame": "Spiel wechseln",
  "header.locations": "{count} Standorte",
  "header.revision": "Rev. {revision}",
  "header.loadingRelays": "lade Relay-Liste …",
  "header.bestActive": "Bester aktiver",
  "header.map": "Karte",
  "header.mapShow": "Karte einblenden",
  "header.mapHide": "Karte ausblenden",
  "header.unblock": "Entsperren",
  "header.apply": "Änderungen anwenden",
  "header.applied": "Angewendet",

  "loading.game": "Lade Standorte für {game} …",
  "loading.pinging": "Messe Ping für {game} …",

  "warn.tooFew":
    "Nur noch {count} Standorte frei. Valves Relay-Netz sucht sich dann Umwege — Matches brechen häufiger ab. Lass mindestens {min} offen.",
  "warn.loadFailed": "Relay-Liste nicht ladbar: {error}",
  "warn.staleRules":
    "{game} lief schon, als die Regeln geschrieben wurden. Windows lässt bestehende Verbindungen weiterlaufen — das Spiel bleibt auf seinem alten Relay, bis du es neu startest.",

  "list.active": "{allowed}/{total} aktiv",
  "list.allOn": "alle an",
  "list.allOff": "alle aus",
  "list.relays": "{count} Relays",
  "list.toggleOn": "Server erlaubt — klicken zum Blockieren",
  "list.toggleOff": "Server blockiert — klicken zum Erlauben",

  "map.alt": "Weltkarte der Valve-Relay-Standorte",
  "map.blocked": "blockiert",

  "region.europe": "Europa",
  "region.north_america": "Nordamerika",
  "region.south_america": "Südamerika",
  "region.asia": "Asien",
  "region.oceania": "Ozeanien",
  "region.middle_east": "Naher Osten",
  "region.africa": "Afrika",

  "sidebar.status": "Status",
  "sidebar.elevate": "Als Admin neu starten",
  "sidebar.rights": "Rechte",
  "sidebar.rights.admin": "Administrator",
  "sidebar.rights.limited": "eingeschränkt",
  "sidebar.installation": "Installation",
  "sidebar.found": "gefunden",
  "sidebar.notFound": "nicht gefunden",
  "sidebar.gameRunning": "Spiel läuft",
  "sidebar.yes": "ja",
  "sidebar.no": "nein",
  "sidebar.rulesActive": "Regeln aktiv",
  "sidebar.rulesInEffect": "Regeln greifen",
  "sidebar.effect.none": "—",
  "sidebar.effect.idle": "beim nächsten Start",
  "sidebar.effect.live": "ja",
  "sidebar.effect.stale": "erst nach Neustart",
  "sidebar.effect.unknown": "unbekannt",
  "sidebar.staleHint":
    "Starte {game} neu, damit die Sperren wirken. Ohne Neustart behält die laufende Sitzung das Relay, über das sie reingekommen ist.",
  "sidebar.elevationHint":
    "Pings laufen auch ohne Adminrechte. Zum Blockieren braucht Windows erhöhte Rechte für die Firewall.",
  "sidebar.alsoBlocked": "Auch gesperrt: {games}",
  "sidebar.clearAll": "Regeln aller Spiele entfernen",

  "quick.title": "Schnellauswahl",
  "quick.allowAll": "Alles erlauben",
  "quick.invert": "Umkehren",
  "quick.onlyRegion": "nur {region}",

  "presets.title": "Profile · {game}",
  "presets.empty":
    "Noch keine Profile für dieses Spiel. Auswahl treffen und unten benennen.",
  "presets.activeCount": "{count} aktiv",
  "presets.delete": "Profil löschen",
  "presets.namePlaceholder": "Profilname",
  "presets.save": "Sichern",

  "share.title": "Einstellungen teilen",
  "share.button": "Teilen",
  "share.hint":
    "Der Code enthält nur die Serverauswahl und die Profile aller Spiele. Installationspfade, Sprache und Ping-Intervall bleiben lokal.",
  "share.exportLabel": "Dein Code",
  "share.copy": "Kopieren",
  "share.copied": "Kopiert",
  "share.importLabel": "Code übernehmen",
  "share.paste": "Einfügen",
  "share.apply": "Übernehmen",
  "share.invalid": "Das ist kein gültiger server2pick-Code.",
  "share.imported":
    "Übernommen. Mit „Änderungen anwenden“ wird es in der Firewall aktiv.",

  "settings.title": "Einstellungen",
  "settings.language": "Sprache",
  "settings.languageAuto": "Automatisch",
  "settings.scopeToGame": "Regeln ans Spiel binden",
  "settings.scopeToGameHint":
    "Jede Regel gilt nur für dieses Programm. Nötig, damit mehrere Spiele eigene Sperrlisten haben können.",
  "settings.scopeWarning":
    "Ohne Bindung gelten die Regeln für jedes Spiel im Relay-Netz gleichzeitig — auch für die, die du hier nicht geöffnet hast.",
  "settings.pingInterval": "Ping-Intervall",
  "settings.program": "Programm",
  "settings.manual": "manuell",
  "settings.auto": "automatisch",
  "settings.choose": "Wählen …",
  "settings.resetToAuto": "Auto",
  "settings.resetToAutoHint": "Wieder automatisch suchen",
  "settings.chooseDialog": "Programm für {game} wählen",
  "settings.programFilter": "Programm",
  "settings.noPath": "nicht gefunden — bitte manuell wählen",
  "settings.wrongExe":
    "Diese Datei passt nicht zu {game} — die Regeln greifen dann nicht.",

  "notice.cleared": "Alle Standorte für {game} wieder freigegeben.",
  "notice.blocked": "{count} Standorte für {game} blockiert.",
  "notice.blockedRunning":
    "{count} Standorte blockiert — {game} läuft aber schon. Greift erst nach einem Neustart des Spiels.",
  "notice.rulesCleared": "Firewall-Regeln für {game} entfernt.",
  "notice.allRulesCleared": "Firewall-Regeln aller Spiele entfernt.",

  "game.deadlock.note": "",
  "game.cs2.note": "Hat 12 China-Standorte, die andere Spiele nicht listen.",
  "game.dota2.note": "Hat zusätzlich Shanghai.",
  "game.tf2.note":
    "SDR greift nur im Valve-Matchmaking, nicht auf Community-Servern.",

  "error.E_ELEVATION": "Administratorrechte nötig, um Firewall-Regeln zu ändern.",
  "error.E_UAC_DECLINED": "Neustart mit Administratorrechten wurde abgebrochen.",
  "error.E_WINDOWS_ONLY": "Nur unter Windows verfügbar.",
  "error.E_SDR_UNREACHABLE": "Valve-API nicht erreichbar.",
  "error.E_SDR_STATUS": "Valve-API antwortete mit einem Fehler.",
  "error.E_SDR_PARSE": "Antwort der Valve-API war unlesbar.",
  "error.E_HTTP_CLIENT": "Netzwerkzugriff konnte nicht aufgebaut werden.",
  "error.E_FIREWALL": "Die Firewall hat den Befehl abgelehnt.",
  "error.E_SPAWN": "Ein Windows-Hilfsprogramm ließ sich nicht starten.",
  "error.E_TEMP_SCRIPT": "Temporäres Skript konnte nicht geschrieben werden.",
  "error.E_UNKNOWN_GAME": "Unbekanntes Spiel.",
  "error.E_CONFIG_DIR": "Konfigurationsordner nicht verfügbar.",
  "error.E_SETTINGS_SAVE": "Einstellungen konnten nicht gespeichert werden.",
  "error.E_SELF_PATH": "Eigener Programmpfad nicht ermittelbar.",
  "error.unknown": "Unerwarteter Fehler.",

  "update.title": "Update",
  "update.available": "Version {version} ist verfügbar.",
  "update.install": "Jetzt installieren",
  "update.downloading": "Wird geladen …",
  "update.restarting": "Installation läuft, das Programm startet neu.",
  "update.failed": "Das Update ließ sich nicht installieren.",
  "update.retry": "Erneut versuchen",
} as const;

export type TranslationKey = keyof typeof de;
/** Shape every other language has to fill. */
export type Dictionary = Record<TranslationKey, string>;
