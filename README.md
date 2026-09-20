# server2pick

Choose which Valve data centres your matches are allowed to use — per game,
with live ping.

![server2pick](docs/screenshot.png)

Supports **Deadlock**, **Counter-Strike 2**, **Dota 2** and **Team Fortress 2**.
Windows only. Interface in English and German.

## What it does

These games never expose the IPs of their servers. Everything is tunnelled
through the **Steam Datagram Relay**: Valve runs points of presence around the
world, each with a handful of relay IPs, and the ones you can reach decide
which region you end up in.

server2pick lists every location for the game you pick, measures its latency
continuously, and blocks the ones you do not want with outbound Windows
Firewall rules. Blocked location, skipped region.

## How a match finds you

```mermaid
flowchart LR
    pc["Your PC<br/>deadlock.exe"]
    fw["server2pick<br/>firewall rules"]
    okpops["Open locations<br/>Sterling · Chicago"]
    nopops["Blocked locations<br/>Frankfurt · Stockholm"]
    mm["Valve<br/>matchmaking"]
    srv["Game server<br/>in a data centre"]

    pc --> fw
    fw -->|"1 · pings"| okpops
    fw -.->|"dropped"| nopops
    okpops -->|"2 · latencies"| mm
    mm -->|"3 · places it"| srv
    okpops ==>|"4 · route in"| srv
```

1. Your game pings every location. The firewall rules drop the ones you closed.
2. So only the open ones come back with a number, and that is all your client
   can report.
3. Valve picks a data centre that suits all ten players in the lobby.
4. You reach the server through an open relay — the thick line is the match
   itself.

Two decisions, not one: where the match is **hosted**, and where you **enter**
the network. Only the second is yours. That is the whole mechanism — it works
by starving the matchmaker of data, not by forbidding anything.

Which is why it is not absolute. With enough European players in the lobby,
Frankfurt can still win, and you would then reach that server through whatever
relay you left open. The Steam overlay names both lines separately, so
*"Game server in Stockholm, relayed via Frankfurt"* is a normal thing to read.

## One blocklist per game

The relay pool is shared: Deadlock's 141 relay IPs are a subset of CS2's 210
and Dota 2's 165. Block those IPs machine-wide and you hit every Steam game at
once.

server2pick binds each rule to that game's executable instead — so Deadlock can
sit on Europe while CS2 keeps North America open, both active at the same time.

## Using it

1. Pick a game on first launch. It reopens the last one afterwards; the
   switcher is top left.
2. Turn locations off with the switches or by clicking the map. Changes you
   have not applied yet get an amber ring.
3. **Apply changes.** Windows asks for administrator rights once — the
   *Restart as admin* button sits in the sidebar.
4. Save combinations you use often as **profiles**.

Applying while the game is already open does not reach it: Windows leaves
existing connections alone, so the running session keeps the relay it started
on. The status card says which of the two you are looking at — *Rules in
effect* reads **yes** only once the game has been started under them.

Rules survive reboots. **Unblock** clears the open game; the link in the status
card clears every game at once.

Do not block too much. The relay network routes around blocked locations, and
match confirmation starts running into timeouts — the app warns you once fewer
than three are left.

## Sharing a setup

**Share** produces a code like `S2P2-S0lNTMnJT86uK65M…`. Anyone who pastes it
gets the same server selection and the same profiles, for every game at once.
Codes written by older versions (`S2P1-…`) still import.

Install paths, language and ping interval stay local: a code never overwrites
where your games live, and it never touches the firewall on its own — the
recipient still presses *Apply changes*.

## Installing

Take the installer from [Releases](../../releases). It is not code signed, so
Windows shows “Unknown publisher” — *More info → Run anyway*.

Ping measurement works without administrator rights. Only the firewall part
needs them, and the app asks when you first block something.

## Updates

On start the app asks GitHub whether a newer release exists. If there is one, a
card appears above the status panel; installing is one click and the app
restarts itself. A failed check stays silent — no network, no complaint.

### Setting up the signing key (once, maintainers only)

The updater only accepts releases signed with this project's key. It is *not*
code signing — the “Unknown publisher” warning above is a separate matter.

```bash
npm run tauri signer generate -- -w minisign.key
```

1. Put the printed **public** key into `plugins.updater.pubkey` in
   `src-tauri/tauri.conf.json`, replacing `PUBKEY_HIER_EINSETZEN`.
2. Store the **private** key as the repository secret
   `TAURI_SIGNING_PRIVATE_KEY`, and its password as
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
3. Keep a copy of the private key somewhere outside GitHub.

Point 3 matters: the key has to stay the same across every future release.
Lose it and installations out in the world can never be updated again — the
only way back is asking people to reinstall by hand.

Until the public key is in place the app runs normally, it just never finds an
update. Local `npm run tauri build` needs the two variables in the environment,
because `createUpdaterArtifacts` is on; releases come from CI, which has them.

## Limits

- It blocks relays, not game servers — those are not public. In edge cases the
  relay network still routes you into a blocked region.
- IPv4 only; Valve lists no IPv6 relays for these games.
- Team Fortress 2 uses the relay network for Valve matchmaking only, not for
  community servers.
- Windows only.

Unofficial. Not affiliated with Valve.
