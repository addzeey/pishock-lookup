# PiShock ID Lookup Worker

Small Cloudflare Worker app that helps users find their PiShock `ShockerId`.

It does two things:

- Calls `GET https://api.pishock.com/Shockers`
- Calls `GET https://api.pishock.com/Shockers/{ShockerId}`

The UI asks for the user's PiShock credentials and sends them to the Worker only for the current request.

- No credentials are stored in KV, D1, cookies, or local storage.
- The Worker forwards the request to PiShock and returns the response.
- Responses are served with `Cache-Control: no-store`.

For these lookup requests, the Worker only sends:

- `X-PiShock-Api-Key`

## Local Development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm install
npm run deploy
```

## Notes

- This app is intentionally simple and does not persist anything.
- PiShock V3 hardware is required for this API flow.
- PiShock V3 docs: `https://docs.pishock.com/pishock/pishock-v3-documentation.html`
