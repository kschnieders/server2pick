import type { Dictionary } from "./de";

export const en: Dictionary = {
  "lang.name": "English",

  "app.name": "server2pick",
  "app.tagline": "Server picker for Steam Datagram Relay games",

  "splash.step.0": "Checking games and firewall rules",
  "splash.step.1": "Loading Valve's relay list",
  "splash.step.2": "Pinging locations",
  "splash.step.3": "Ready",

  "picker.title": "Choose a game",
  "picker.subtitle":
    "Each game keeps its own blocklist — they all apply at the same time.",
  "picker.running": "running",
  "picker.blocked": "{count} blocked",
  "picker.notFound": "not found — you can pick the path later",
  "picker.cancel": "Cancel",
  "picker.language": "Language",

  "header.switchGame": "Switch game",
  "header.locations": "{count} locations",
  "header.revision": "rev. {revision}",
  "header.loadingRelays": "loading relay list …",
  "header.bestActive": "Best allowed",
  "header.unblock": "Unblock",
  "header.apply": "Apply changes",
  "header.applied": "Applied",

  "loading.game": "Loading locations for {game} …",
  "loading.pinging": "Measuring ping for {game} …",

  "warn.tooFew":
    "Only {count} of {total} locations left open. Valve's relay network starts routing around them and matches fail to confirm more often. We recommend keeping at least {min} active.",
  "warn.loadFailed": "Could not load the relay list: {error}",
  "warn.staleBinding":
    "The firewall rules for {game} point at a different program path than the current one — they block nothing. This happens after the game is moved or reinstalled. “Apply changes” rewrites them.",
  "warn.staleRules":
    "{game} was already running when the rules were written. Windows leaves existing connections alone — the game keeps the relay it started on until you restart it.",

  "list.active": "{allowed}/{total} active",
  "list.allOn": "all on",
  "list.allOff": "all off",
  "list.relays": "{count} relays",
  "list.toggleOn": "Allowed — click to block",
  "list.toggleOff": "Blocked — click to allow",

  "map.alt": "World map of Valve relay locations",
  "map.blocked": "blocked",

  "region.europe": "Europe",
  "region.north_america": "North America",
  "region.south_america": "South America",
  "region.asia": "Asia",
  "region.oceania": "Oceania",
  "region.middle_east": "Middle East",
  "region.africa": "Africa",

  "sidebar.status": "Status",
  "sidebar.elevate": "Restart as admin",
  "sidebar.rights": "Privileges",
  "sidebar.rights.admin": "Administrator",
  "sidebar.rights.limited": "limited",
  "sidebar.installation": "Installation",
  "sidebar.found": "found",
  "sidebar.notFound": "not found",
  "sidebar.gameRunning": "Game running",
  "sidebar.yes": "yes",
  "sidebar.no": "no",
  "sidebar.rulesActive": "Active rules",
  "sidebar.rulesInEffect": "Rules in effect",
  "sidebar.effect.none": "—",
  "sidebar.effect.idle": "at next launch",
  "sidebar.effect.live": "yes",
  "sidebar.effect.stale": "after a restart",
  "sidebar.effect.unknown": "unknown",
  "sidebar.staleHint":
    "Restart {game} for the blocks to bite. Until then the running session keeps the relay it came in through.",
  "sidebar.elevationHint":
    "Administrator rights are required to apply the settings.",
  "sidebar.alsoBlocked": "Also blocked: {games}",
  "sidebar.clearAll": "Remove rules for all games",

  "quick.title": "Quick select",
  "quick.allowAll": "Allow all",
  "quick.invert": "Invert",
  "quick.onlyRegion": "only {region}",
  "quick.byLatency": "By latency",
  "quick.blockAbove": "block above {ms} ms",
  "quick.blockAboveHint":
    "Blocks every measured location above it and frees the ones below. Locations without a reading stay as they are.",

  "presets.title": "Profiles · {game}",
  "presets.empty":
    "No profiles for this game yet. Make a selection and name it below.",
  "presets.activeCount": "{count} active",
  "presets.delete": "Delete profile",
  "presets.namePlaceholder": "Profile name",
  "presets.save": "Save",

  "share.title": "Share settings",
  "share.button": "Share",
  "share.hint":
    "The code carries only the server selection and the profiles of every game. Install paths, language and ping interval stay local.",
  "share.exportLabel": "Your code",
  "share.copy": "Copy",
  "share.copied": "Copied",
  "share.importLabel": "Apply a code",
  "share.paste": "Paste",
  "share.apply": "Apply",
  "share.invalid": "That is not a valid server2pick code.",
  "share.imported":
    "Applied. Press “Apply changes” to make it active in the firewall.",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageAuto": "Automatic",
  "settings.scopeToGame": "Bind rules to the game",
  "settings.scopeToGameHint":
    "Each rule applies to this program only. Required for several games to hold separate blocklists.",
  "settings.scopeWarning":
    "Without binding, the rules apply to every game on the relay network at once — including the ones you have not opened here.",
  "settings.pingInterval": "Ping interval",
  "settings.program": "Program",
  "settings.manual": "manual",
  "settings.auto": "automatic",
  "settings.choose": "Choose …",
  "settings.resetToAuto": "Auto",
  "settings.resetToAutoHint": "Go back to auto-detection",
  "settings.chooseDialog": "Choose the program for {game}",
  "settings.programFilter": "Program",
  "settings.noPath": "not found — please choose it manually",
  "settings.wrongExe":
    "This file does not match {game} — the rules would have no effect.",

  "notice.cleared": "All locations for {game} allowed again.",
  "notice.blocked": "{count} locations blocked for {game}.",
  "notice.blockedRunning":
    "{count} locations blocked — but {game} is already running. Takes effect after you restart the game.",
  "notice.rulesCleared": "Firewall rules for {game} removed.",
  "notice.allRulesCleared": "Firewall rules for all games removed.",

  "game.deadlock.note": "",
  "game.cs2.note": "Lists 12 Chinese locations that other games do not.",
  "game.dota2.note": "Adds Shanghai on top.",
  "game.tf2.note":
    "SDR only applies to Valve matchmaking, not to community servers.",

  "error.E_ELEVATION": "Administrator rights are required to change firewall rules.",
  "error.E_UAC_DECLINED": "The elevated restart was cancelled.",
  "error.E_WINDOWS_ONLY": "Windows only.",
  "error.E_SDR_UNREACHABLE": "Valve's API is unreachable.",
  "error.E_SDR_STATUS": "Valve's API returned an error.",
  "error.E_SDR_PARSE": "Valve's API response could not be read.",
  "error.E_HTTP_CLIENT": "The network client could not be created.",
  "error.E_FIREWALL": "The firewall rejected the command.",
  "error.E_SPAWN": "A Windows helper program could not be started.",
  "error.E_TEMP_SCRIPT": "The temporary script could not be written.",
  "error.E_UNKNOWN_GAME": "Unknown game.",
  "error.E_CONFIG_DIR": "The configuration folder is unavailable.",
  "error.E_SETTINGS_SAVE": "Settings could not be saved.",
  "error.E_SELF_PATH": "Could not determine this program's own path.",
  "error.unknown": "Unexpected error.",

  "info.tab.guide": "Guide",
  "info.tab.licenses": "Licenses",
  "info.thirdPartyTitle": "Components used",
  "info.thirdPartyBody":
    "This app is built on libraries by other people, which stay under their own licenses. The full list with every attribution and license text sits next to the program as a file.",
  "info.thirdPartyOpen": "Open the list",
  "info.thirdPartyFailed":
    "The file could not be opened. You will find it as THIRD-PARTY-LICENSES.md in the installation folder.",
  "info.heading": "About server2pick",
  "info.title": "Guide",
  "info.close": "Close the guide",
  "info.what":
    "Valve does not send matches straight to a server — they travel through relay locations around the world, and matchmaking picks which one you get. server2pick blocks the relays of individual locations in the Windows firewall, so matchmaking can no longer put you there.",
  "info.stepsTitle": "How to use it",
  "info.step1": "Pick your game in the top left.",
  "info.step2":
    "Block the locations you do not want — from the list, the map or the quick select. The ping readings show what is worth keeping.",
  "info.step3":
    "Press “Apply changes”. Windows asks for administrator rights once.",
  "info.step4": "Start the game. That is it.",
  "info.notesTitle": "Worth knowing",
  "info.note1":
    "The rules live in the Windows firewall, not in this app. They keep working while server2pick is closed — until you lift them here.",
  "info.note2":
    "Keep at least three locations open. Block too many and the relay network starts routing around them, so matches fail to confirm more often.",
  "info.note3":
    "If the game was already running when you blocked, it stays on the relay it came in through. Only restarting the game makes the block bite.",
  "info.note4":
    "Every rule is bound to the game executable. Move or reinstall the game and the old rules point nowhere — the app warns you and rewrites them at the press of a button.",
  "info.note5":
    "What gets blocked are relays, not the game servers themselves. In rare cases the network still routes you into a blocked region.",
  "info.shareTitle": "Profiles and sharing",
  "info.shareBody":
    "A selection can be named and saved as a profile on the right. The share icon gives you a code to pass on — it carries only the server selection and the profiles, never paths from your machine.",
  "info.disclaimer": "Unofficial. Not affiliated with Valve.",

  "prefs.title": "Settings",
  "prefs.tab.general": "General",
  "prefs.tab.appearance": "Appearance",
  "prefs.tab.behaviour": "Behaviour",
  "prefs.autostart": "Start with Windows",
  "prefs.autostartHint":
    "Opens server2pick when you sign in. It does not apply any rules by itself.",
  "prefs.closeAction": "When closing",
  "prefs.closeActionHint":
    "What happens to live firewall rules when you close the window.",
  "prefs.close.ask": "Ask",
  "prefs.close.keep": "Keep them",
  "prefs.close.remove": "Remove them",
  "prefs.map": "Show the world map",
  "prefs.mapHint":
    "The map above the server list. Off leaves room for more locations.",
  "prefs.overlay": "Notice on start",
  "prefs.overlayHint":
    "Shows which locations are blocked right now when the app opens.",
  "prefs.updates": "Check for updates",
  "prefs.updatesHint": "Asks GitHub for a newer release on start.",
  "prefs.pingHint": "Shorter intervals react faster and use more network.",

  "active.title": "Blocks active",
  "active.ofTotal": "of {total} locations blocked for {game}",
  "active.otherGames": "Also blocked: {games}",
  "active.persistHint":
    "These rules apply while server2pick is closed too. They stay until you lift them here.",
  "active.unblock": "Lift the blocks",
  "active.keep": "Keep editing",

  "close.title": "Rules stay active",
  "close.body":
    "{count} firewall rules are in place. They keep working after the app is closed.",
  "close.keep": "Keep them and quit",
  "close.remove": "Remove them and quit",
  "close.needsAdmin":
    "Removing them needs administrator rights. Restart as admin, or leave the rules in place.",
  "close.cancel": "Cancel",

  "update.title": "Update",
  "update.available": "Version {version} is available.",
  "update.install": "Install now",
  "update.downloading": "Downloading …",
  "update.restarting": "Installing, the app will restart.",
  "update.failed": "The update could not be installed.",
  "update.retry": "Try again",
};
