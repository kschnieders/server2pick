//! Settings and presets, persisted as JSON next to the app's other data.
//!
//! Everything that can differ between games — the blocklist, the profiles, a
//! hand-picked executable — lives under that game's id, so two games never
//! overwrite each other's choices.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub name: String,
    /// POP ids that this preset blocks.
    pub blocked: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GameSettings {
    /// Manual override for the executable; empty means auto-detect.
    pub game_path: Option<String>,
    pub presets: Vec<Preset>,
    /// Last selection, so the UI can restore it before the firewall is queried.
    pub last_blocked: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// UI language code; `None` means follow the system.
    pub language: Option<String>,
    /// Game id the app reopens with; `None` means show the picker.
    pub last_game: Option<String>,
    /// Limit firewall rules to the game's executable instead of blocking the
    /// relays machine-wide. Off means one blocklist hits every SDR game.
    pub scope_to_game: bool,
    pub ping_interval_ms: u64,
    pub games: HashMap<String, GameSettings>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: None,
            last_game: None,
            scope_to_game: true,
            ping_interval_ms: 4000,
            games: HashMap::new(),
        }
    }
}

impl Settings {
    pub fn game(&self, id: &str) -> GameSettings {
        self.games.get(id).cloned().unwrap_or_default()
    }

    pub fn game_path(&self, id: &str) -> Option<String> {
        self.games
            .get(id)
            .and_then(|g| g.game_path.clone())
            .filter(|p| !p.trim().is_empty())
    }
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("E_CONFIG_DIR|{e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("E_CONFIG_DIR|{e}"))?;
    Ok(dir.join("settings.json"))
}

pub fn load(app: &tauri::AppHandle) -> Settings {
    // A broken or missing file must never keep the app from starting.
    settings_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn save(app: &tauri::AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("E_SETTINGS_SAVE|{e}"))?;
    std::fs::write(path, json).map_err(|e| format!("E_SETTINGS_SAVE|{e}"))
}
