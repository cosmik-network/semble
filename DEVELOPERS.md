## DB Migrations

- Whenever there are changes to existing sql schema files (`.sql.ts`) or new schema files are created, you must run `npm run db:generate`.
- This will generate migration files for drizzle to run during app initialization

## Fly.io managed postgres

- connect with psql `fly mpg connect`

## deployment

- `fly launch` (create/configure/deploy new app)
- `fly deploy` (deploy app/redeploy after changes)
- `fly logs --app annos`
- `fly secrets set SUPER_SECRET_KEY=password1234`
- make sure that new environment vars are added as secrets with the above command

## local development with mocked backend

- `npm install`
- in one terminal: `npm run dev:mock`
- another terminal: `npm run webapp:dev`
- ui is available on `localhost:4000`

## local development with cloudflared tunnel

Useful for testing the locally-running app from another device (phone, etc.) against public HTTPS hostnames. The tunnel maps:

- `https://frontend.yourcustomtunnel.domain` → `localhost:4000`
- `https://backend.yourcustomtunnel.domain` → `localhost:3000`

### Prerequisites

- `cloudflared` installed (`brew install cloudflared`)
- A configured tunnel named `semble-tunnel` with the ingress rules above (one-time setup via `cloudflared tunnel login` / `tunnel create` / `~/.cloudflared/config.yml` / DNS routes — see Cloudflare Zero Trust docs)

### Run

_NOTE: you may need to clear cookies in the browser for both localhost and the tunnel url. As well as clearing the `.next/` directory._

- terminal 1: `cloudflared tunnel run semble-tunnel`
- terminal 2: `npm run dev:tunnel` (or `npm run dev:mock:tunnel` for mocked backend)
- terminal 3: `npm run webapp:dev:tunnel`
- ui is available on `https://frontend-development.semble.cafe`

### What the `:tunnel` scripts change

- Backend: CORS allows the tunnel frontend origin; auth cookies are set with `Domain=.semble.cafe; Secure`; ATProto OAuth `client_id` points at the public tunnel metadata URL.
- Frontend: loads `src/webapp/.env.tunnel` so `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` point at the tunnel hostnames.
