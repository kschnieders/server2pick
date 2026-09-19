//! ICMP latency probing via the Windows IP Helper API.
//!
//! `IcmpSendEcho` is used instead of a raw socket on purpose: raw ICMP sockets
//! need administrator rights on Windows, and the ping view has to stay useful
//! while the app runs unelevated.

use serde::{Deserialize, Serialize};
use std::ffi::c_void;
use std::net::Ipv4Addr;

#[derive(Debug, Clone, Deserialize)]
pub struct PingTarget {
    pub pop: String,
    pub ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PingResult {
    pub pop: String,
    /// Best round trip of this round in milliseconds, `null` if every probe failed.
    pub rtt: Option<u32>,
    pub sent: u32,
    pub received: u32,
}

/// Relays inside one POP share a datacenter, so probing a few is enough.
const RELAYS_PER_POP: usize = 3;
const TIMEOUT_MS: u32 = 1200;

#[cfg(windows)]
fn ping_once(addr: Ipv4Addr, timeout_ms: u32) -> Option<u32> {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::NetworkManagement::IpHelper::{
        IcmpCloseHandle, IcmpCreateFile, IcmpSendEcho, ICMP_ECHO_REPLY,
    };

    const PAYLOAD: [u8; 32] = [0x61; 32];
    // Room for the reply struct, the echoed payload and any appended IP options.
    const REPLY_CAP: usize = std::mem::size_of::<ICMP_ECHO_REPLY>() + PAYLOAD.len() + 64;

    unsafe {
        let handle = IcmpCreateFile();
        if handle == INVALID_HANDLE_VALUE {
            return None;
        }

        let mut reply = [0u8; REPLY_CAP];
        let dest = u32::from_le_bytes(addr.octets());
        let replies = IcmpSendEcho(
            handle,
            dest,
            PAYLOAD.as_ptr() as *const c_void,
            PAYLOAD.len() as u16,
            std::ptr::null(),
            reply.as_mut_ptr() as *mut c_void,
            REPLY_CAP as u32,
            timeout_ms,
        );
        IcmpCloseHandle(handle);

        if replies == 0 {
            return None;
        }

        let echo = &*(reply.as_ptr() as *const ICMP_ECHO_REPLY);
        // IP_SUCCESS == 0; anything else is a TTL expiry, unreachable host, …
        if echo.Status != 0 {
            return None;
        }
        Some(echo.RoundTripTime)
    }
}

#[cfg(not(windows))]
fn ping_once(_addr: Ipv4Addr, _timeout_ms: u32) -> Option<u32> {
    None
}

/// Probes every target once and returns the best latency per POP.
pub async fn round(targets: Vec<PingTarget>) -> Vec<PingResult> {
    let mut jobs = Vec::new();

    for target in targets {
        let ips: Vec<Ipv4Addr> = target
            .ips
            .iter()
            .take(RELAYS_PER_POP)
            .filter_map(|ip| ip.parse().ok())
            .collect();

        jobs.push(tokio::task::spawn_blocking(move || {
            let mut best: Option<u32> = None;
            let mut received = 0;
            for ip in &ips {
                if let Some(rtt) = ping_once(*ip, TIMEOUT_MS) {
                    received += 1;
                    best = Some(best.map_or(rtt, |b| b.min(rtt)));
                }
            }
            PingResult {
                pop: target.pop,
                rtt: best,
                sent: ips.len() as u32,
                received,
            }
        }));
    }

    futures::future::join_all(jobs)
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pings_a_valve_relay() {
        // Amsterdam relay from the live SDR config; needs network access.
        let rtt = ping_once("155.133.248.36".parse().unwrap(), TIMEOUT_MS);
        println!("rtt = {rtt:?}");
        assert!(rtt.is_some(), "no ICMP reply from relay");
    }
}
