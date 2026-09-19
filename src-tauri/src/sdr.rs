//! Loads Valve's Steam Datagram Relay configuration for a given game.
//!
//! These games never expose the IPs of their servers — all traffic is tunnelled
//! through SDR relays that sit in Valve's points of presence (POPs). Blocking the
//! relays of a POP is what makes matchmaking skip that region.
//!
//! The POP set is per app id: CS2 lists twelve Chinese locations that Deadlock
//! does not, Dota 2 adds Shanghai. The relay IPs behind them are one shared
//! pool though, which is why rules have to be bound to a single executable.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const SDR_URL: &str = "https://api.steampowered.com/ISteamApps/GetSDRConfig/v1";

#[derive(Debug, Deserialize)]
struct RawConfig {
    revision: Option<i64>,
    pops: HashMap<String, RawPop>,
}

#[derive(Debug, Deserialize)]
struct RawPop {
    desc: Option<String>,
    /// `[longitude, latitude]`
    geo: Option<(f64, f64)>,
    #[serde(default)]
    relays: Vec<RawRelay>,
}

#[derive(Debug, Deserialize)]
struct RawRelay {
    ipv4: String,
}

/// One Valve point of presence, flattened into what the UI needs.
#[derive(Debug, Clone, Serialize)]
pub struct Pop {
    pub id: String,
    pub name: String,
    pub country: String,
    pub region: String,
    pub lon: f64,
    pub lat: f64,
    pub ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SdrConfig {
    pub revision: Option<i64>,
    pub pops: Vec<Pop>,
}

/// Splits `"Frankfurt (Germany)"` into `("Frankfurt", "Germany")`.
fn split_desc(desc: &str) -> (String, String) {
    match desc.split_once('(') {
        Some((city, rest)) => (
            city.trim().to_string(),
            rest.trim_end_matches(')').trim().to_string(),
        ),
        None => (desc.trim().to_string(), String::new()),
    }
}

/// Coarse continent buckets, derived from the POP's own coordinates so that new
/// Valve locations are grouped correctly without a hardcoded table.
///
/// Returns a stable key, never a display name — the frontend owns the wording
/// so that regions translate with the rest of the interface.
fn region_of(lon: f64, lat: f64) -> &'static str {
    match (lon, lat) {
        (lon, lat) if lon >= -30.0 && lon <= 45.0 && lat >= 34.0 => "europe",
        (lon, lat) if lon >= -30.0 && lon <= 60.0 && lat < 34.0 && lat > -40.0 => {
            if lon >= 25.0 {
                "middle_east"
            } else {
                "africa"
            }
        }
        (lon, _) if lon > 45.0 && lon <= 150.0 => "asia",
        (lon, lat) if lon > 110.0 && lat < 0.0 => "oceania",
        (lon, _) if lon > 150.0 => "oceania",
        (_, lat) if lat >= 13.0 => "north_america",
        _ => "south_america",
    }
}

pub async fn fetch(appid: u32) -> Result<SdrConfig, String> {
    let url = format!("{SDR_URL}?appid={appid}");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("E_HTTP_CLIENT|{e}"))?;

    // Errors travel as `CODE|detail` so the frontend can translate the code and
    // still show the technical detail.
    let raw: RawConfig = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("E_SDR_UNREACHABLE|{e}"))?
        .error_for_status()
        .map_err(|e| format!("E_SDR_STATUS|{e}"))?
        .json()
        .await
        .map_err(|e| format!("E_SDR_PARSE|{e}"))?;

    let mut pops: Vec<Pop> = raw
        .pops
        .into_iter()
        // POPs without relays are internal to Valve and cannot be blocked.
        .filter(|(_, p)| !p.relays.is_empty())
        .map(|(id, p)| {
            let desc = p.desc.unwrap_or_else(|| id.to_uppercase());
            let (name, country) = split_desc(&desc);
            let (lon, lat) = p.geo.unwrap_or((0.0, 0.0));
            Pop {
                id,
                name,
                country,
                region: region_of(lon, lat).to_string(),
                lon,
                lat,
                ips: p.relays.into_iter().map(|r| r.ipv4).collect(),
            }
        })
        .collect();

    pops.sort_by(|a, b| (&a.region, &a.name).cmp(&(&b.region, &b.name)));

    Ok(SdrConfig {
        revision: raw.revision,
        pops,
    })
}
