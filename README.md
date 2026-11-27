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

Emoji and Unicode messages are supported by UTF-8. Username colours are assigned consistently from a terminal colour palette (collisions are possible). Set NO_COLOR=1 to disable colours. Update both server and clients together. Private messages are routed only to sender and recipient, but are not encrypted.

## Local history

Type `/history` to display the last 20 saved entries for the current server. Messages and presence notices are appended to a plaintext log under `~/.termichat/`. Clients on the same computer using the same OS account and server address share this log, so duplicate entries are possible. Different computers keep separate copies. Only received messages are saved; missed messages are not synchronized yet.

## Local Wi-Fi

On the host, run `HOST=0.0.0.0 npm run server` (macOS/Linux). On another device with this repository, run `npm run chat -- HOST_IP 5050`, replacing HOST_IP with the host's LAN address. Allow TCP port 5050 through the host firewall only on a trusted private network.

## Limitations

Prototype only. Messages are plaintext, usernames are not authenticated, and local history is stored unencrypted. Do not expose the server to the internet or use it for sensitive information.

## Roadmap

- [x] Local chat history
- [x] Rooms and private messages
- [x] Emoji and username colours
- Secure online messaging
- Synchronization
- npm distribution
