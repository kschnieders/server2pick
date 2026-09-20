import type { Dictionary } from "./de";

export const ru: Dictionary = {
  "lang.name": "Русский",

  "app.name": "server2pick",
  "app.tagline": "Выбор серверов для игр на Steam Datagram Relay",

  "splash.step.0": "Проверка игр и правил брандмауэра",
  "splash.step.1": "Загрузка списка реле Valve",
  "splash.step.2": "Замер пинга до локаций",
  "splash.step.3": "Готово",

  "picker.title": "Выберите игру",
  "picker.subtitle":
    "У каждой игры свой список блокировок — они действуют одновременно.",
  "picker.running": "запущена",
  "picker.blocked": "заблокировано: {count}",
  "picker.notFound": "не найдена — путь можно указать позже",
  "picker.cancel": "Отмена",
  "picker.language": "Язык",

  "header.switchGame": "Сменить игру",
  "header.locations": "локаций: {count}",
  "header.revision": "рев. {revision}",
  "header.loadingRelays": "загрузка списка реле …",
  "header.bestActive": "Лучшая разрешённая",
  "header.map": "Карта",
  "header.mapShow": "Показать карту",
  "header.mapHide": "Скрыть карту",
  "header.unblock": "Разблокировать",
  "header.apply": "Применить изменения",
  "header.applied": "Применено",

  "loading.game": "Загрузка локаций для {game} …",
  "loading.pinging": "Замер пинга для {game} …",

  "warn.tooFew":
    "Открытыми осталось всего {count} локаций. Сеть реле Valve начнёт строить обходные маршруты — матчи будут срываться чаще. Оставьте открытыми хотя бы {min}.",
  "warn.loadFailed": "Не удалось загрузить список реле: {error}",
  "warn.staleBinding":
    "Правила брандмауэра для {game} указывают на другой путь к программе — они ничего не блокируют. Так бывает после переноса или переустановки игры. «Применить изменения» перезапишет их.",
  "warn.staleRules":
    "{game} уже была запущена, когда создавались правила. Windows не трогает существующие соединения — игра останется на том реле, через которое вошла, пока вы её не перезапустите.",

  "list.active": "активно {allowed}/{total}",
  "list.allOn": "все вкл",
  "list.allOff": "все выкл",
  "list.relays": "реле: {count}",
  "list.toggleOn": "Разрешено — нажмите, чтобы заблокировать",
  "list.toggleOff": "Заблокировано — нажмите, чтобы разрешить",

  "map.alt": "Карта мира с локациями реле Valve",
  "map.blocked": "заблокировано",

  "region.europe": "Европа",
  "region.north_america": "Северная Америка",
  "region.south_america": "Южная Америка",
  "region.asia": "Азия",
  "region.oceania": "Океания",
  "region.middle_east": "Ближний Восток",
  "region.africa": "Африка",

  "sidebar.status": "Состояние",
  "sidebar.elevate": "Перезапустить от админа",
  "sidebar.rights": "Права",
  "sidebar.rights.admin": "Администратор",
  "sidebar.rights.limited": "ограниченные",
  "sidebar.installation": "Установка",
  "sidebar.found": "найдена",
  "sidebar.notFound": "не найдена",
  "sidebar.gameRunning": "Игра запущена",
  "sidebar.yes": "да",
  "sidebar.no": "нет",
  "sidebar.rulesActive": "Активных правил",
  "sidebar.rulesInEffect": "Правила действуют",
  "sidebar.effect.none": "—",
  "sidebar.effect.idle": "при следующем запуске",
  "sidebar.effect.live": "да",
  "sidebar.effect.stale": "после перезапуска",
  "sidebar.effect.unknown": "неизвестно",
  "sidebar.staleHint":
    "Перезапустите {game}, чтобы блокировки заработали. До этого текущая сессия останется на том реле, через которое вошла.",
  "sidebar.elevationHint":
    "Для применения настроек нужны права администратора.",
  "sidebar.alsoBlocked": "Также заблокировано: {games}",
  "sidebar.clearAll": "Удалить правила всех игр",

  "quick.title": "Быстрый выбор",
  "quick.allowAll": "Разрешить все",
  "quick.invert": "Инвертировать",
  "quick.onlyRegion": "только {region}",
  "quick.byLatency": "По задержке",
  "quick.blockAbove": "блокировать выше {ms} мс",
  "quick.blockAboveHint":
    "Блокирует все измеренные локации выше порога и освобождает те, что ниже. Локации без измерений остаются как есть.",

  "presets.title": "Профили · {game}",
  "presets.empty":
    "Для этой игры профилей пока нет. Сделайте выбор и назовите его ниже.",
  "presets.activeCount": "активно {count}",
  "presets.delete": "Удалить профиль",
  "presets.namePlaceholder": "Название профиля",
  "presets.save": "Сохранить",

  "share.title": "Поделиться настройками",
  "share.button": "Поделиться",
  "share.hint":
    "Код содержит только выбор серверов и профили всех игр. Пути установки, язык и интервал пинга остаются на вашем компьютере.",
  "share.exportLabel": "Ваш код",
  "share.copy": "Копировать",
  "share.copied": "Скопировано",
  "share.importLabel": "Применить код",
  "share.paste": "Вставить",
  "share.apply": "Применить",
  "share.invalid": "Это не действительный код server2pick.",
  "share.imported":
    "Применено. Нажмите «Применить изменения», чтобы это вступило в силу в брандмауэре.",

  "settings.title": "Настройки",
  "settings.language": "Язык",
  "settings.languageAuto": "Автоматически",
  "settings.scopeToGame": "Привязать правила к игре",
  "settings.scopeToGameHint":
    "Каждое правило действует только для этой программы. Необходимо, чтобы у разных игр были отдельные списки блокировок.",
  "settings.scopeWarning":
    "Без привязки правила действуют сразу для всех игр в сети реле — включая те, которые вы здесь не открывали.",
  "settings.pingInterval": "Интервал пинга",
  "settings.program": "Программа",
  "settings.manual": "вручную",
  "settings.auto": "автоматически",
  "settings.choose": "Выбрать …",
  "settings.resetToAuto": "Авто",
  "settings.resetToAutoHint": "Вернуться к автоопределению",
  "settings.chooseDialog": "Выберите программу для {game}",
  "settings.programFilter": "Программа",
  "settings.noPath": "не найдено — выберите вручную",
  "settings.wrongExe":
    "Этот файл не соответствует {game} — правила не сработают.",

  "notice.cleared": "Все локации для {game} снова разрешены.",
  "notice.blocked": "Для {game} заблокировано локаций: {count}.",
  "notice.blockedRunning":
    "Заблокировано локаций: {count} — но {game} уже запущена. Подействует после перезапуска игры.",
  "notice.rulesCleared": "Правила брандмауэра для {game} удалены.",
  "notice.allRulesCleared": "Правила брандмауэра для всех игр удалены.",

  "game.deadlock.note": "",
  "game.cs2.note": "Содержит 12 локаций в Китае, которых нет у других игр.",
  "game.dota2.note": "Дополнительно есть Шанхай.",
  "game.tf2.note":
    "SDR работает только в матчмейкинге Valve, но не на community-серверах.",

  "error.E_ELEVATION":
    "Для изменения правил брандмауэра нужны права администратора.",
  "error.E_UAC_DECLINED": "Перезапуск с правами администратора отменён.",
  "error.E_WINDOWS_ONLY": "Только для Windows.",
  "error.E_SDR_UNREACHABLE": "API Valve недоступен.",
  "error.E_SDR_STATUS": "API Valve вернул ошибку.",
  "error.E_SDR_PARSE": "Не удалось прочитать ответ API Valve.",
  "error.E_HTTP_CLIENT": "Не удалось создать сетевое подключение.",
  "error.E_FIREWALL": "Брандмауэр отклонил команду.",
  "error.E_SPAWN": "Не удалось запустить служебную программу Windows.",
  "error.E_TEMP_SCRIPT": "Не удалось записать временный скрипт.",
  "error.E_UNKNOWN_GAME": "Неизвестная игра.",
  "error.E_CONFIG_DIR": "Папка конфигурации недоступна.",
  "error.E_SETTINGS_SAVE": "Не удалось сохранить настройки.",
  "error.E_SELF_PATH": "Не удалось определить путь к самой программе.",
  "error.unknown": "Непредвиденная ошибка.",

  "update.title": "Обновление",
  "update.available": "Доступна версия {version}.",
  "update.install": "Установить сейчас",
  "update.downloading": "Загрузка …",
  "update.restarting": "Идёт установка, программа перезапустится.",
  "update.failed": "Не удалось установить обновление.",
  "update.retry": "Повторить",
};
