//! The games server2pick knows about, and where to find them on disk.
//!
//! The list is curated on purpose. Valve's `GetSDRConfig` endpoint answers
//! `success: true` for *any* app id — Rust and Destiny 2 hand back the same
//! 29-POP default set as Deadlock without using Steam Datagram Relay at all —
//! so a free-form app id field would happily create firewall rules that cannot
//! possibly do anything.

use serde::Serialize;
use std::collections::HashSet;
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

/// One `tasklist` call covers every game — spawning four would be wasteful for
/// something that only feeds a status line.
fn running_processes() -> HashSet<String> {
    #[cfg(windows)]
    {
        if let Ok(out) = crate::firewall::run_hidden("tasklist", &["/NH", "/FO", "CSV"]) {
            return out
                .lines()
                .filter_map(|l| l.split('"').nth(1))
                .map(|n| n.to_lowercase())
                .collect();
        }
    }
    HashSet::new()
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

            GameInfo {
                id: game.id.to_string(),
                name: game.name.to_string(),
                short: game.short.to_string(),
                appid: game.appid,
                installed: path.is_some(),
                path,
                running: game
                    .process_names
                    .iter()
                    .any(|n| processes.contains(&n.to_lowercase())),
                exe_names: game.process_names.iter().map(|n| n.to_string()).collect(),
            }
        })
        .collect()
}
