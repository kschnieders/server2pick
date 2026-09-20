import type { Dictionary } from "./de";

export const es: Dictionary = {
  "lang.name": "Español",

  "app.name": "server2pick",
  "app.tagline": "Selector de servidores para juegos con Steam Datagram Relay",

  "splash.step.0": "Comprobando juegos y reglas del firewall",
  "splash.step.1": "Cargando la lista de relés de Valve",
  "splash.step.2": "Midiendo el ping de las ubicaciones",
  "splash.step.3": "Listo",

  "picker.title": "Elige un juego",
  "picker.subtitle":
    "Cada juego tiene su propia lista de bloqueo — todas se aplican a la vez.",
  "picker.running": "en ejecución",
  "picker.blocked": "{count} bloqueadas",
  "picker.notFound": "no encontrado — puedes indicar la ruta más tarde",
  "picker.cancel": "Cancelar",
  "picker.language": "Idioma",

  "header.switchGame": "Cambiar de juego",
  "header.locations": "{count} ubicaciones",
  "header.revision": "rev. {revision}",
  "header.loadingRelays": "cargando lista de relés …",
  "header.bestActive": "Mejor permitida",
  "header.map": "Mapa",
  "header.mapShow": "Mostrar el mapa",
  "header.mapHide": "Ocultar el mapa",
  "header.unblock": "Desbloquear",
  "header.apply": "Aplicar cambios",
  "header.applied": "Aplicado",

  "loading.game": "Cargando ubicaciones de {game} …",
  "loading.pinging": "Midiendo el ping de {game} …",

  "warn.tooFew":
    "Solo quedan {count} ubicaciones abiertas. La red de relés de Valve empieza a buscar rodeos y las partidas fallan más a menudo. Deja abiertas al menos {min}.",
  "warn.loadFailed": "No se pudo cargar la lista de relés: {error}",
  "warn.staleRules":
    "{game} ya estaba en ejecución cuando se escribieron las reglas. Windows no toca las conexiones existentes: el juego mantiene el relé por el que entró hasta que lo reinicies.",

  "list.active": "{allowed}/{total} activas",
  "list.allOn": "todas sí",
  "list.allOff": "todas no",
  "list.relays": "{count} relés",
  "list.toggleOn": "Permitida — haz clic para bloquear",
  "list.toggleOff": "Bloqueada — haz clic para permitir",

  "map.alt": "Mapa mundial de las ubicaciones de relés de Valve",
  "map.blocked": "bloqueada",

  "region.europe": "Europa",
  "region.north_america": "Norteamérica",
  "region.south_america": "Sudamérica",
  "region.asia": "Asia",
  "region.oceania": "Oceanía",
  "region.middle_east": "Oriente Medio",
  "region.africa": "África",

  "sidebar.status": "Estado",
  "sidebar.elevate": "Reiniciar como administrador",
  "sidebar.rights": "Permisos",
  "sidebar.rights.admin": "Administrador",
  "sidebar.rights.limited": "limitados",
  "sidebar.installation": "Instalación",
  "sidebar.found": "encontrada",
  "sidebar.notFound": "no encontrada",
  "sidebar.gameRunning": "Juego en ejecución",
  "sidebar.yes": "sí",
  "sidebar.no": "no",
  "sidebar.rulesActive": "Reglas activas",
  "sidebar.rulesInEffect": "Reglas en vigor",
  "sidebar.effect.none": "—",
  "sidebar.effect.idle": "en el próximo inicio",
  "sidebar.effect.live": "sí",
  "sidebar.effect.stale": "tras reiniciar",
  "sidebar.effect.unknown": "desconocido",
  "sidebar.staleHint":
    "Reinicia {game} para que los bloqueos surtan efecto. Hasta entonces, la sesión en curso mantiene el relé por el que entró.",
  "sidebar.elevationHint":
    "Se necesitan permisos de administrador para aplicar los ajustes.",
  "sidebar.alsoBlocked": "También bloqueado: {games}",
  "sidebar.clearAll": "Eliminar las reglas de todos los juegos",

  "quick.title": "Selección rápida",
  "quick.allowAll": "Permitir todo",
  "quick.invert": "Invertir",
  "quick.onlyRegion": "solo {region}",

  "presets.title": "Perfiles · {game}",
  "presets.empty":
    "Aún no hay perfiles para este juego. Haz una selección y ponle nombre abajo.",
  "presets.activeCount": "{count} activas",
  "presets.delete": "Eliminar perfil",
  "presets.namePlaceholder": "Nombre del perfil",
  "presets.save": "Guardar",

  "share.title": "Compartir la configuración",
  "share.button": "Compartir",
  "share.hint":
    "El código solo lleva la selección de servidores y los perfiles de todos los juegos. Las rutas de instalación, el idioma y el intervalo de ping se quedan en tu equipo.",
  "share.exportLabel": "Tu código",
  "share.copy": "Copiar",
  "share.copied": "Copiado",
  "share.importLabel": "Aplicar un código",
  "share.paste": "Pegar",
  "share.apply": "Aplicar",
  "share.invalid": "Ese no es un código válido de server2pick.",
  "share.imported":
    "Aplicado. Pulsa «Aplicar cambios» para que tenga efecto en el firewall.",

  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.languageAuto": "Automático",
  "settings.scopeToGame": "Vincular las reglas al juego",
  "settings.scopeToGameHint":
    "Cada regla se aplica solo a este programa. Necesario para que varios juegos tengan listas de bloqueo separadas.",
  "settings.scopeWarning":
    "Sin vincular, las reglas se aplican a la vez a todos los juegos de la red de relés — incluidos los que no has abierto aquí.",
  "settings.pingInterval": "Intervalo de ping",
  "settings.program": "Programa",
  "settings.manual": "manual",
  "settings.auto": "automático",
  "settings.choose": "Elegir …",
  "settings.resetToAuto": "Auto",
  "settings.resetToAutoHint": "Volver a la detección automática",
  "settings.chooseDialog": "Elige el programa de {game}",
  "settings.programFilter": "Programa",
  "settings.noPath": "no encontrado — elígelo manualmente",
  "settings.wrongExe":
    "Este archivo no corresponde a {game} — las reglas no tendrían efecto.",

  "notice.cleared": "Todas las ubicaciones de {game} vuelven a estar permitidas.",
  "notice.blocked": "{count} ubicaciones bloqueadas para {game}.",
  "notice.blockedRunning":
    "{count} ubicaciones bloqueadas — pero {game} ya está en ejecución. Tendrá efecto cuando reinicies el juego.",
  "notice.rulesCleared": "Reglas del firewall de {game} eliminadas.",
  "notice.allRulesCleared": "Reglas del firewall de todos los juegos eliminadas.",

  "game.deadlock.note": "",
  "game.cs2.note": "Incluye 12 ubicaciones chinas que otros juegos no listan.",
  "game.dota2.note": "Añade además Shanghái.",
  "game.tf2.note":
    "SDR solo se aplica al matchmaking de Valve, no a los servidores de la comunidad.",

  "error.E_ELEVATION":
    "Se necesitan permisos de administrador para cambiar las reglas del firewall.",
  "error.E_UAC_DECLINED": "Se canceló el reinicio con permisos elevados.",
  "error.E_WINDOWS_ONLY": "Solo para Windows.",
  "error.E_SDR_UNREACHABLE": "No se puede acceder a la API de Valve.",
  "error.E_SDR_STATUS": "La API de Valve devolvió un error.",
  "error.E_SDR_PARSE": "No se pudo leer la respuesta de la API de Valve.",
  "error.E_HTTP_CLIENT": "No se pudo crear el cliente de red.",
  "error.E_FIREWALL": "El firewall rechazó el comando.",
  "error.E_SPAWN": "No se pudo iniciar un programa auxiliar de Windows.",
  "error.E_TEMP_SCRIPT": "No se pudo escribir el script temporal.",
  "error.E_UNKNOWN_GAME": "Juego desconocido.",
  "error.E_CONFIG_DIR": "La carpeta de configuración no está disponible.",
  "error.E_SETTINGS_SAVE": "No se pudo guardar la configuración.",
  "error.E_SELF_PATH": "No se pudo determinar la ruta del propio programa.",
  "error.unknown": "Error inesperado.",

  "update.title": "Actualización",
  "update.available": "La versión {version} está disponible.",
  "update.install": "Instalar ahora",
  "update.downloading": "Descargando …",
  "update.restarting": "Instalando, la aplicación se reiniciará.",
  "update.failed": "No se pudo instalar la actualización.",
  "update.retry": "Reintentar",
};
