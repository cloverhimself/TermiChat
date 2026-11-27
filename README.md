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

## Local Wi-Fi

On the host, run `HOST=0.0.0.0 npm run server` (macOS/Linux). On another device with this repository, run `npm run chat -- HOST_IP 5050`, replacing HOST_IP with the host's LAN address. Allow TCP port 5050 through the host firewall only on a trusted private network.

## Limitations

Prototype only. Messages are plaintext, usernames are not authenticated, and no history is saved. Do not expose the server to the internet or use it for sensitive information.

## Roadmap

- Local chat history
- Rooms and private messages
- Secure online messaging
- Synchronization
- npm distribution
