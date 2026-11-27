# KLVRChat

A dependency-free Node.js terminal chat prototype.

Run `npm start` for the interactive menu, or `npm link` to install the local `klvrchat` command. The package is prepared for public npm publication after release verification.

## Getting started

Requires Node.js 18 or newer. No npm install needed.

In terminal 1:

```sh
npm run server
```

In terminals 2 and 3:

```sh
npm run chat
```

Choose a different username in each client, then type messages. Use /quit to leave.

## Commands

- `/join ROOM`: create or enter a room. Everyone starts in lobby.
- `/rooms`: list active rooms.
- `/users`: list users in your current room.
- `/dm USER MESSAGE`: send a direct message to an online user in any room.
- `/history`: show local history.
- `/clear`: clear the terminal.
- `/help`: list commands.
- `/quit`: disconnect.

Emoji and Unicode messages are supported by UTF-8. Username colours are assigned by the server in join order: blue, yellow, red, pink, green, cyan, purple, white, then shades. Active users get distinct palette slots until the palette is exhausted. Set NO_COLOR=1 to disable colours. Update both server and clients together. Private messages are routed only to sender and recipient, but LAN messages are not encrypted. Online TLS protects transport, not end-to-end content.

## Local history

Type `/history` to display the last 20 saved entries for the current server. Messages and presence notices are appended to a plaintext log under `~/.termichat/`. Clients on the same computer using the same OS account and server address share this log, so duplicate entries are possible. Different computers keep separate copies. Room messages have unique IDs and the server replays up to 100 recent messages per room when you join. The server cache is in memory (up to 100 rooms), so restarts erase it. Private messages are not replayed. Rooms are public to connected users. Local history is shared within an OS account and server address, not isolated by username.

## Local Wi-Fi

On the host, run `npm run server:lan` (macOS, Linux or Windows). On another device run `npm run discover` and select a discovered server. Discovery uses IPv4 UDP port 5051 and works only when the network permits local broadcasts; manual connection remains available. Discovered servers are not authenticated, so select only a trusted host. On another device with this repository, run `npm run chat -- HOST_IP 5050`, replacing HOST_IP with the host's LAN address. Allow TCP port 5050 and UDP port 5051 through the host firewall only on a trusted private network.

## Configure once

Run `klvrchat setup` to save username, network method and port in `~/.termichat/settings.json`. Then run `klvrchat host --online` or select menu option 6. Auto mode prefers Tailscale and falls back to a LAN IPv4 address; it does not claim internet reachability. Choose public mode to look up your external IPv4 through api.ipify.org (requires internet and sends your IP to that service), or manual mode to save a reachable address. Public hosting still needs port forwarding and firewall access. The selected port must be free. OpenSSL remains required on the host. Settings are local and do not store invite secrets.

## Self-hosted online rooms (experimental)

No paid hosting is required. The host runs KLVRChat on their own machine. For connections across networks, use a reachable public IP with TCP port forwarding, or a private overlay network such as Tailscale (both participants must have access). KLVRChat does not implement automatic NAT traversal.

Install OpenSSL on the host, then run:

```sh
klvrchat share REACHABLE_IP 5050
```

Share the generated TC1 invite privately. Guests run `klvrchat` and select option 7 to paste it, or use `klvrchat join INVITE` (the latter may expose the invite in shell history). The host can join using the same invite in another terminal. The invite includes a random shared secret and the TLS certificate fingerprint; keep it secret and verify it came from the host. A new hosting session generates a new invite. Stop the host process to close the session. Certificate pinning authenticates the host before the client sends its secret. This is not end-to-end encryption or individual identity verification.

## Online mode (manual TLS configuration)

Use a host with a reachable TCP port, a DNS hostname and a valid TLS certificate and key. Do not commit credentials or certificates' private keys. Configure these environment variables on the server:

- TERMICHAT_TOKEN: a randomly generated shared secret (24–256 characters, no whitespace).
- TERMICHAT_KEY: path to TLS private key.
- TERMICHAT_CERT: path to certificate chain.
- PORT: optional TCP port (defaults to 5050).

Run `npm run server:online`. On each client, set TERMICHAT_TOKEN to the same secret and run `npm run chat -- chat.example.com 5050 --tls`. The hostname must match the certificate; for a private CA, set TERMICHAT_CA to the trusted CA certificate path. Never disable certificate verification. Online mode has shared access control, not individual accounts or end-to-end encryption. It is not deployed or production audited.

## Limitations

Prototype only. Messages are plaintext, usernames are not authenticated, and local history is stored unencrypted. Do not expose plaintext LAN mode to the internet or use this prototype for sensitive information.

## Roadmap

- [x] Local chat history
- [x] Rooms and private messages
- [x] Emoji and username colours
- [x] LAN server discovery
- [x] Experimental TLS online mode
- [x] Bounded room replay
- [x] Local CLI packaging
- [x] Self-hosted online invites
- Individual accounts, durable synchronization, automatic NAT traversal, production security testing and npm publication
