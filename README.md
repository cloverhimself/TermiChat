# TermiChat

A dependency-free Node.js terminal chat prototype.

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
- `/help`: list commands.
- `/quit`: disconnect.

Emoji and Unicode messages are supported by UTF-8. Username colours are assigned by the server in join order: blue, yellow, red, pink, green, cyan, purple, white, then shades. Active users get distinct palette slots until the palette is exhausted. Set NO_COLOR=1 to disable colours. Update both server and clients together. Private messages are routed only to sender and recipient, but are not encrypted.

## Local history

Type `/history` to display the last 20 saved entries for the current server. Messages and presence notices are appended to a plaintext log under `~/.termichat/`. Clients on the same computer using the same OS account and server address share this log, so duplicate entries are possible. Different computers keep separate copies. Only received messages are saved; missed messages are not synchronized yet.

## Local Wi-Fi

On the host, run `npm run server:lan` (macOS, Linux or Windows). On another device run `npm run discover` and select a discovered server. Discovery uses IPv4 UDP port 5051 and works only when the network permits local broadcasts; manual connection remains available. Discovered servers are not authenticated, so select only a trusted host. On another device with this repository, run `npm run chat -- HOST_IP 5050`, replacing HOST_IP with the host's LAN address. Allow TCP port 5050 and UDP port 5051 through the host firewall only on a trusted private network.

## Limitations

Prototype only. Messages are plaintext, usernames are not authenticated, and local history is stored unencrypted. Do not expose the server to the internet or use it for sensitive information.

## Roadmap

- [x] Local chat history
- [x] Rooms and private messages
- [x] Emoji and username colours
- [x] LAN server discovery
- Secure online messaging
- Synchronization
- npm distribution
