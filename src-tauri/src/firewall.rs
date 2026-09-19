//! Windows Firewall integration.
//!
//! Every rule this app creates carries the group `server2pick`, which
//! makes the whole set addressable in one shot — nothing this app writes can
//! outlive it unnoticed, and `Remove-NetFirewallRule -Group` is the undo button.

use serde::{Deserialize, Serialize};
use std::process::Command;

pub const GROUP: &str = "server2pick";
/// Display names look like `server2pick: deadlock/fra`, so both the game and
/// the location stay readable in our UI and in `wf.msc` alike.
const NAME_PREFIX: &str = "server2pick: ";

#[derive(Debug, Clone, Deserialize)]
pub struct PopRule {
    pub pop: String,
    pub ips: Vec<String>,
}

/// One blocked location, as read back from the firewall.
#[derive(Debug, Clone, Serialize)]
pub struct ActiveRule {
    pub game: String,
    pub pop: String,
}

fn rule_name(game: &str, pop: &str) -> String {
    format!("{NAME_PREFIX}{game}/{pop}")
}

/// Runs a console tool without flashing a window on screen.
pub fn run_hidden(program: &str, args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new(program);
    cmd.args(args);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let out = cmd
        .output()
        .map_err(|e| format!("E_SPAWN|{program}: {e}"))?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(format!(
            "E_FIREWALL|{}",
            if detail.is_empty() {
                format!("{program} exit {:?}", out.status.code())
            } else {
                detail
            }
        ));
    }

    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

/// Runs a PowerShell script from a temp file — that sidesteps every layer of
/// quoting between the Rust process, cmd.exe and PowerShell itself.
fn run_powershell(script: &str) -> Result<String, String> {
    let path = std::env::temp_dir().join(format!("server2pick-{}.ps1", std::process::id()));
    std::fs::write(&path, script)
        .map_err(|e| format!("E_TEMP_SCRIPT|{e}"))?;

    let result = run_hidden(
        "powershell",
        &[
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &path.to_string_lossy(),
        ],
    );

    let _ = std::fs::remove_file(&path);
    result
}

/// Escapes a value for a PowerShell single-quoted string literal.
fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

/// Drops anything that is not a plain IPv4 literal. The list comes from Valve,
/// but it reaches us over the network and ends up inside a shell script.
fn sanitize_ips(ips: &[String]) -> Vec<String> {
    ips.iter()
        .filter(|ip| ip.parse::<std::net::Ipv4Addr>().is_ok())
        .cloned()
        .collect()
}

#[cfg(windows)]
pub fn is_elevated() -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION {
            TokenIsElevated: 0,
        };
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut std::ffi::c_void,
            size,
            &mut size,
        );
        CloseHandle(token);
        ok != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(not(windows))]
pub fn is_elevated() -> bool {
    false
}

/// Relaunches this executable through the UAC prompt. The caller exits afterwards.
#[cfg(windows)]
pub fn relaunch_elevated() -> Result<(), String> {
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let exe = std::env::current_exe()
        .map_err(|e| format!("E_SELF_PATH|{e}"))?
        .to_string_lossy()
        .to_string();

    let to_wide = |s: &str| {
        s.encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>()
    };
    let verb = to_wide("runas");
    let file = to_wide(&exe);

    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL as i32,
        )
    };

    // ShellExecuteW returns a pseudo HINSTANCE; anything <= 32 is a failure,
    // most commonly the user dismissing the UAC dialog.
    if (result as isize) <= 32 {
        return Err("E_UAC_DECLINED|".into());
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn relaunch_elevated() -> Result<(), String> {
    Err("E_WINDOWS_ONLY|".into())
}

/// Reads back every rule this app owns, across all games — straight from the
/// firewall rather than from our own settings file, because the firewall is
/// what actually decides.
pub fn active_rules() -> Result<Vec<ActiveRule>, String> {
    let script = format!(
        r#"$ErrorActionPreference = 'SilentlyContinue'
Get-NetFirewallRule -Group {group} | ForEach-Object {{ $_.DisplayName }}
"#,
        group = ps_quote(GROUP)
    );

    let out = run_powershell(&script)?;
    Ok(out
        .lines()
        .filter_map(|l| l.trim().strip_prefix(NAME_PREFIX))
        .filter_map(|rest| rest.split_once('/'))
        .map(|(game, pop)| ActiveRule {
            game: game.to_string(),
            pop: pop.to_string(),
        })
        .collect())
}

/// Replaces one game's rule set in a single PowerShell session: wipe that
/// game's rules, then write exactly the ones that should exist. Applying a
/// desired state instead of a diff means a crash mid-way can never leave a
/// half-applied mixture — and touching only this game's rules is what lets two
/// games hold different blocklists at the same time.
pub fn apply(
    game: &str,
    game_label: &str,
    rules: Vec<PopRule>,
    program: Option<String>,
) -> Result<(), String> {
    if !is_elevated() {
        return Err("E_ELEVATION|".into());
    }

    let mut script = String::from(
        r#"$ErrorActionPreference = 'Stop'
try {
"#,
    );
    script.push_str(&remove_snippet(Some(game)));

    for rule in &rules {
        let ips = sanitize_ips(&rule.ips);
        if ips.is_empty() {
            continue;
        }
        let ip_list = ips
            .iter()
            .map(|ip| ps_quote(ip))
            .collect::<Vec<_>>()
            .join(",");

        script.push_str(&format!(
            "  New-NetFirewallRule -DisplayName {name} -Group {group} -Description {desc} \
             -Direction Outbound -Action Block -Protocol Any -Profile Any -Enabled True \
             -RemoteAddress @({ips})",
            name = ps_quote(&rule_name(game, &rule.pop)),
            group = ps_quote(GROUP),
            // Written into the Windows firewall, outside our own UI, so it
            // stays in one neutral language rather than following the app.
            desc = ps_quote(&format!(
                "server2pick: blocks the Steam Datagram Relays of {} for {}.",
                rule.pop, game_label
            )),
            ips = ip_list,
        ));
        if let Some(path) = &program {
            script.push_str(&format!(" -Program {}", ps_quote(path)));
        }
        script.push_str(" | Out-Null\n");
    }

    script.push_str(
        r#"  Write-Output 'OK'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
"#,
    );

    run_powershell(&script).map(|_| ())
}

/// `None` clears every game at once.
fn remove_snippet(game: Option<&str>) -> String {
    let base = format!(
        "  Get-NetFirewallRule -Group {group} -ErrorAction SilentlyContinue",
        group = ps_quote(GROUP)
    );
    match game {
        Some(id) => format!(
            "{base} | Where-Object {{ $_.DisplayName -like {pattern} }} | Remove-NetFirewallRule -ErrorAction SilentlyContinue\n",
            pattern = ps_quote(&format!("{NAME_PREFIX}{id}/*")),
        ),
        None => format!("{base} | Remove-NetFirewallRule -ErrorAction SilentlyContinue\n"),
    }
}

/// Removes one game's rules, or all of them when `game` is `None`.
pub fn clear(game: Option<&str>) -> Result<(), String> {
    if !is_elevated() {
        return Err("E_ELEVATION|".into());
    }

    let script = format!(
        "$ErrorActionPreference = 'Stop'\ntry {{\n{}  Write-Output 'OK'\n}} catch {{\n  Write-Error $_.Exception.Message\n  exit 1\n}}\n",
        remove_snippet(game)
    );
    run_powershell(&script).map(|_| ())
}
