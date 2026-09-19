//! The games server2pick knows about, and where to find them on disk.
//!
//! The list is curated on purpose. Valve's `GetSDRConfig` endpoint answers
//! `success: true` for *any* app id — Rust and Destiny 2 hand back the same
//! 29-POP default set as Deadlock without using Steam Datagram Relay at all —
//! so a free-form app id field would happily create firewall rules that cannot
//! possibly do anything.

use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

pub struct GameDef {
    pub id: &'static str,
    pub name: &'static str,
    /// Two letters for the logo tile.
    pub short: &'static str,
    pub appid: u32,
    /// Candidates relative to a Steam library root, most likely first.
    pub exe_paths: &'static [&'static str],
    pub process_names: &'static [&'static str],
}

pub const GAMES: &[GameDef] = &[
    GameDef {
        id: "deadlock",
        name: "Deadlock",
        short: "DL",
        appid: 1422450,
        exe_paths: &["steamapps/common/Deadlock/game/bin/win64/deadlock.exe"],
        process_names: &["deadlock.exe"],
    },
    GameDef {
        id: "cs2",
        name: "Counter-Strike 2",
        short: "CS",
        appid: 730,
        exe_paths: &[
            "steamapps/common/Counter-Strike Global Offensive/game/bin/win64/cs2.exe",
        ],
        process_names: &["cs2.exe"],
    },
    GameDef {
        id: "dota2",
        name: "Dota 2",
        short: "D2",
        appid: 570,
        exe_paths: &["steamapps/common/dota 2 beta/game/bin/win64/dota2.exe"],
        process_names: &["dota2.exe"],
    },
    GameDef {
        id: "tf2",
        name: "Team Fortress 2",
        short: "TF",
        appid: 440,
        exe_paths: &[
            "steamapps/common/Team Fortress 2/tf_win64.exe",
            "steamapps/common/Team Fortress 2/hl2.exe",
        ],
        process_names: &["tf_win64.exe", "hl2.exe"],
    },
];

pub fn find(id: &str) -> Option<&'static GameDef> {
    GAMES.iter().find(|g| g.id == id)
}

#[cfg(all(test, windows))]
mod tests {
    /// The FILETIME epoch is 1601, the one the UI compares against is 1970.
    /// Getting that offset wrong would not fail loudly — it would just hand out
    /// a wrong verdict forever, so the arithmetic gets checked against a clock.
    #[test]
    fn start_times_are_plausible_unix_millis() {
        let now = crate::store::now_millis();
        let processes = super::running_processes();

        assert!(
            !processes.is_empty(),
            "the test runner itself should show up in the snapshot"
        );

        let known: Vec<i64> = processes.values().filter_map(|v| *v).collect();
        assert!(!known.is_empty(), "no process gave up its start time");

        for started in known {
            // 2020-01-01, comfortably before any machine this runs on booted.
            assert!(
                started > 1_577_836_800_000,
                "start time {started} predates the epoch offset being right"
            );
            // A second of slack: the clock is read after the snapshot.
            assert!(
                started <= now + 1_000,
                "start time {started} lies in the future (now {now})"
            );
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInfo {
    pub id: String,
    pub name: String,
    pub short: String,
    pub appid: u32,
    pub installed: bool,
    pub path: Option<String>,
    pub running: bool,
    /// Unix milliseconds the running process started. `None` when the game is
    /// not running, or when Windows refused to hand out its start time.
    ///
    /// Compared against the moment the rules were written, this is what says
    /// whether a session is actually running under them: the firewall never
    /// tears down connections that already exist, so a game that was up before
    /// the rules keeps its old relay until it restarts.
    pub running_since: Option<i64>,
    /// Accepted executable file names, so the UI can flag a manual pick that
    /// points at the wrong program.
    pub exe_names: Vec<String>,
}

#[cfg(windows)]
fn steam_root_from_registry() -> Option<PathBuf> {
    // Reading one string out of the registry is not worth a winreg dependency.
    let out = crate::firewall::run_hidden(
        "reg",
        &["query", r"HKCU\Software\Valve\Steam", "/v", "SteamPath"],
    )
    .ok()?;
    let line = out.lines().find(|l| l.contains("SteamPath"))?;
    let value = line.split_whitespace().skip(2).collect::<Vec<_>>().join(" ");
    if value.is_empty() {
        None
    } else {
        Some(PathBuf::from(value.replace('/', "\\")))
    }
}

#[cfg(not(windows))]
fn steam_root_from_registry() -> Option<PathBuf> {
    None
}

/// Every Steam library on this machine, including the ones on other drives.
fn library_paths() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(p) = steam_root_from_registry() {
        roots.push(p);
    }
    roots.push(PathBuf::from(r"C:\Program Files (x86)\Steam"));
    roots.push(PathBuf::from(r"C:\Program Files\Steam"));

    let mut libs: Vec<PathBuf> = Vec::new();
    for root in roots {
        if !root.exists() || libs.contains(&root) {
            continue;
        }
        libs.push(root.clone());
        collect_libraries(&root, &mut libs);
    }
    libs
}

/// Pulls the `"path"` values out of `libraryfolders.vdf` — Valve's own
/// key/value format, of which the paths are the only part we need.
fn collect_libraries(steam_root: &Path, out: &mut Vec<PathBuf>) {
    let vdf = steam_root.join("steamapps").join("libraryfolders.vdf");
    let Ok(text) = std::fs::read_to_string(&vdf) else {
        return;
    };
    for line in text.lines() {
        let line = line.trim();
        if !line.starts_with("\"path\"") {
            continue;
        }
        if let Some(raw) = line.split('"').nth(3) {
            let path = PathBuf::from(raw.replace("\\\\", "\\"));
            if !out.contains(&path) {
                out.push(path);
            }
        }
    }
}

pub fn find_executable(game: &GameDef) -> Option<String> {
    for lib in library_paths() {
        for rel in game.exe_paths {
            let exe = lib.join(rel.replace('/', "\\"));
            if exe.exists() {
                return Some(exe.to_string_lossy().to_string());
            }
        }
    }
    None
}

/// Turns a Win32 `FILETIME` — 100 ns ticks since 1601 — into unix milliseconds.
#[cfg(windows)]
fn filetime_to_unix_millis(ft: windows_sys::Win32::Foundation::FILETIME) -> i64 {
    const EPOCH_DIFF_MS: i64 = 11_644_473_600_000;
    let ticks = ((ft.dwHighDateTime as u64) << 32) | ft.dwLowDateTime as u64;
    (ticks / 10_000) as i64 - EPOCH_DIFF_MS
}

/// Every running process by lowercased executable name, mapped to when it
/// started. One snapshot covers every game — and unlike shelling out to
/// `tasklist`, it spawns nothing, which matters for something that polls next
/// to a running match.
///
/// The start time needs a handle on the process, and Windows can refuse that
/// one (a game running elevated while we are not). The name is still in the
/// snapshot, so such a process counts as running with an unknown start time.
#[cfg(windows)]
fn running_processes() -> HashMap<String, Option<i64>> {
    use windows_sys::Win32::Foundation::{CloseHandle, FILETIME, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{
        GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    let mut found: HashMap<String, Option<i64>> = HashMap::new();

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return found;
        }

        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        let mut ok = Process32FirstW(snapshot, &mut entry) != 0;
        while ok {
            let len = entry
                .szExeFile
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(entry.szExeFile.len());
            let name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_lowercase();

            let mut started = None;
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, entry.th32ProcessID);
            if !handle.is_null() {
                let mut created: FILETIME = std::mem::zeroed();
                let mut ignored: [FILETIME; 3] = std::mem::zeroed();
                if GetProcessTimes(
                    handle,
                    &mut created,
                    &mut ignored[0],
                    &mut ignored[1],
                    &mut ignored[2],
                ) != 0
                {
                    started = Some(filetime_to_unix_millis(created));
                }
                CloseHandle(handle);
            }

            // Several instances of the same executable: keep the oldest, since
            // that is the one most likely to predate the rules.
            found
                .entry(name)
                .and_modify(|current| {
                    *current = match (*current, started) {
                        (Some(a), Some(b)) => Some(a.min(b)),
                        _ => None,
                    };
                })
                .or_insert(started);

            ok = Process32NextW(snapshot, &mut entry) != 0;
        }

        CloseHandle(snapshot);
    }

    found
}

#[cfg(not(windows))]
fn running_processes() -> HashMap<String, Option<i64>> {
    HashMap::new()
}

/// Describes every known game: installed, where, and whether it is running.
/// `overrides` supplies user-chosen executable paths by game id.
pub fn list(overrides: &dyn Fn(&str) -> Option<String>) -> Vec<GameInfo> {
    let processes = running_processes();

    GAMES
        .iter()
        .map(|game| {
            let path = overrides(game.id)
                .filter(|p| !p.trim().is_empty())
                .or_else(|| find_executable(game));

            // A game may answer to more than one executable name (TF2). The
            // earliest start wins: if any of them predates the rules, the
            // session does.
            let live: Vec<Option<i64>> = game
                .process_names
                .iter()
                .filter_map(|n| processes.get(&n.to_lowercase()).copied())
                .collect();
            // One unreadable start time makes the whole answer unknown — a
            // guess here would be a green light we cannot back up.
            let running_since = if live.iter().any(|s| s.is_none()) {
                None
            } else {
                live.iter().filter_map(|s| *s).min()
            };

            GameInfo {
                id: game.id.to_string(),
                name: game.name.to_string(),
                short: game.short.to_string(),
                appid: game.appid,
                installed: path.is_some(),
                path,
                running: !live.is_empty(),
                running_since,
                exe_names: game.process_names.iter().map(|n| n.to_string()).collect(),
            }
        })
        .collect()
}
