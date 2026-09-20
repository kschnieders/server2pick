mod firewall;
mod games;
mod ping;
mod sdr;
mod store;

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemState {
    elevated: bool,
    /// Every known game with its install state — drives the picker and the
    /// switcher in the header.
    games: Vec<games::GameInfo>,
    /// Every rule this app currently owns, across all games.
    rules: Vec<firewall::ActiveRule>,
    /// Unix milliseconds of the last rule write, per game id. Held against
    /// `GameInfo::running_since`, it answers the question the rule count cannot:
    /// whether the session on screen is actually running under those rules.
    applied_at: std::collections::HashMap<String, i64>,
    /// Set when the firewall could not be queried.
    error: Option<String>,
}

/// Resolves the executable a game's rules should be bound to, honouring a
/// manual override before falling back to the Steam libraries.
fn resolve_program(settings: &store::Settings, game_id: &str) -> Option<String> {
    if !settings.scope_to_game {
        return None;
    }
    settings
        .game_path(game_id)
        .or_else(|| games::find(game_id).and_then(games::find_executable))
}

#[tauri::command]
async fn fetch_pops(appid: u32) -> Result<sdr::SdrConfig, String> {
    sdr::fetch(appid).await
}

#[tauri::command]
async fn ping_round(targets: Vec<ping::PingTarget>) -> Vec<ping::PingResult> {
    ping::round(targets).await
}

#[tauri::command]
async fn system_state(app: tauri::AppHandle) -> SystemState {
    let settings = store::load(&app);

    let applied_at = settings
        .games
        .iter()
        .filter_map(|(id, g)| g.applied_at.map(|ts| (id.clone(), ts)))
        .collect();

    let game_list = tokio::task::spawn_blocking(move || {
        games::list(&|id| settings.game_path(id))
    })
    .await
    .unwrap_or_default();

    let (rules, error) = match tokio::task::spawn_blocking(firewall::active_rules).await {
        Ok(Ok(list)) => (list, None),
        Ok(Err(e)) => (Vec::new(), Some(e)),
        Err(e) => (Vec::new(), Some(e.to_string())),
    };

    SystemState {
        elevated: firewall::is_elevated(),
        games: game_list,
        rules,
        applied_at,
        error,
    }
}

#[tauri::command]
async fn apply_blocks(
    app: tauri::AppHandle,
    game: String,
    rules: Vec<firewall::PopRule>,
) -> Result<Vec<String>, String> {
    let def = games::find(&game).ok_or_else(|| format!("E_UNKNOWN_GAME|{game}"))?;

    let mut settings = store::load(&app);
    let program = resolve_program(&settings, &game);
    let applied: Vec<String> = rules.iter().map(|r| r.pop.clone()).collect();

    let game_id = game.clone();
    let label = def.name.to_string();
    tokio::task::spawn_blocking(move || firewall::apply(&game_id, &label, rules, program))
        .await
        .map_err(|e| e.to_string())??;

    let mut entry = settings.game(&game);
    entry.last_blocked = applied.clone();
    entry.applied_at = Some(store::now_millis());
    settings.games.insert(game, entry);
    let _ = store::save(&app, &settings);

    Ok(applied)
}

/// Clears one game's rules, or every game's when `game` is omitted.
#[tauri::command]
async fn clear_blocks(app: tauri::AppHandle, game: Option<String>) -> Result<(), String> {
    let target = game.clone();
    tokio::task::spawn_blocking(move || firewall::clear(target.as_deref()))
        .await
        .map_err(|e| e.to_string())??;

    let mut settings = store::load(&app);
    match game {
        Some(id) => {
            let mut entry = settings.game(&id);
            entry.last_blocked.clear();
            entry.applied_at = None;
            settings.games.insert(id, entry);
        }
        None => {
            for entry in settings.games.values_mut() {
                entry.last_blocked.clear();
                entry.applied_at = None;
            }
        }
    }
    let _ = store::save(&app, &settings);
    Ok(())
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> store::Settings {
    store::load(&app)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: store::Settings) -> Result<(), String> {
    store::save(&app, &settings)
}

#[tauri::command]
fn elevate(app: tauri::AppHandle) -> Result<(), String> {
    firewall::relaunch_elevated()?;
    // The elevated instance takes over; this one must go or two windows fight
    // over the same firewall rules.
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init());

    // The updater restarts the app through the process plugin, so the two
    // always travel together.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            fetch_pops,
            ping_round,
            system_state,
            apply_blocks,
            clear_blocks,
            load_settings,
            save_settings,
            elevate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
