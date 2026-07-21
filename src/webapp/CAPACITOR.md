# Running the Capacitor (native) app locally

The native shell loads the **live web app over the network** (`server.url` in
`capacitor.config.ts`) — it does not bundle a static build. In native mode the
WebView authenticates with a locally-stored Bearer token instead of cookies.

`Capacitor.isNativePlatform()` is a runtime check, so the same web build serves
both the browser and the native WebView. You do NOT need a separate frontend
build for native.

> Capacitor 8's CLI requires **Node ≥ 22**. Run all `cap` / `npx cap` commands
> under `nvm use 22`. The rest of the repo still runs on Node 20.

---

## Option A — Local dev servers (iOS Simulator)

The simulator shares your Mac's network, so `127.0.0.1` reaches your local
servers directly.

1. **Start backend + workers** (mock auth avoids real Bluesky OAuth; the mock
   OAuth flow self-redirects through the backend callback, exercising the new
   native token handoff):

   ```bash
   # from repo root
   npm run dev:mock          # USE_MOCK_AUTH=true etc. — backend on :3000
   ```

2. **Start the frontend** (serves the WebView; already points at :3000 API):

   ```bash
   npm run webapp:dev        # Next.js on http://127.0.0.1:4000
   ```

3. **Point Capacitor at the local frontend and sync** (from `src/webapp`):

   ```bash
   cd src/webapp
   nvm use 22
   CAP_SERVER_URL=http://127.0.0.1:4000 npx cap sync ios
   ```

   (HTTP is fine — the config sets `cleartext: true` when the URL is `http://`.)

4. **Open Xcode and run on a simulator:**

   ```bash
   npx cap open ios
   ```

   In Xcode: select an iPhone simulator, press ▶. First run may prompt to
   install CocoaPods dependencies / trust the scheme.

### What to test

- Cold launch → login screen loads from your local Next.js.
- Enter a handle → the system browser (Safari) opens the mock OAuth URL, the
  backend callback 302s to `com.semble.app://auth?code=...`, Safari prompts
  "Open in Semble?" → app foregrounds, exchanges the code, lands on `/home`.
- Kill and relaunch the app → still signed in (token persisted in Preferences).
- Log out → back to login; relaunch → still logged out.

---

## Option B — Cloudflared tunnel (most prod-like)

Real HTTPS for both frontend and backend; required to test real Bluesky OAuth
and cookie/ITP behavior, and to run on a physical device.

1. Run the tunnel (separate terminal): `cloudflared tunnel run semble-tunnel`
2. Start the stack in tunnel mode: `npm run dev:tunnel`
   (frontend `https://frontend-development.semble.cafe`,
   backend `https://backend-development.semble.cafe`).
3. Point Capacitor at the tunnel frontend and sync:

   ```bash
   cd src/webapp
   nvm use 22
   CAP_SERVER_URL=https://frontend-development.semble.cafe npx cap sync ios
   npx cap open ios
   ```

---

## Notes / gotchas

- **`CAP_SERVER_URL` is an ORIGIN, not a path.** Use `https://semble.so`,
  `http://127.0.0.1:4000`, or a tunnel origin — never `.../login`. The native
  app skips the marketing landing page itself: server components detect native
  via the User-Agent marker (`appendUserAgent: 'SembleNativeApp'`) and redirect
  `/` → `/login`, which routes on to `/home` once the client confirms the token.
- **Native-aware SSR**: `verifySessionOnServer` returns null (never redirects)
  for native requests — a top-level WebView navigation can't send the Bearer
  token, so cookie-based SSR auth can't work. Protected pages render and the
  client-side `useAuth` guard enforces auth with the stored Bearer token (a
  brief loading beat on protected pages is expected). Detection lives in
  `lib/native/platform.server.ts` / `lib/native/userAgent.ts`.
- **Backend CORS**: the LOCAL allowlist includes `capacitor://localhost` and
  `https://localhost` (the native WebView origins) so Bearer API calls aren't
  blocked. See `getAllowedOrigins()` in `src/shared/infrastructure/http/app.ts`.
- **Deep-link scheme** `com.semble.app://auth` is registered in
  `ios/App/App/Info.plist` (CFBundleURLTypes) and
  `android/app/src/main/AndroidManifest.xml` (intent-filter). The backend must
  redirect to the same scheme — set `NATIVE_APP_SCHEME=com.semble.app` (this is
  also the default in `EnvironmentConfigService`).
- **After changing `CAP_SERVER_URL`** you must re-run `npx cap sync` — the value
  is baked into `ios/App/App/capacitor.config.json` at sync time.
- **Redis**: the production native code store is Redis-backed. Under
  `USE_MOCK_PERSISTENCE=true` (as in `dev:mock`) it falls back to an in-memory
  store, which is fine for single-instance local testing.
