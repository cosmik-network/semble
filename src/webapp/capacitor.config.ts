import type { CapacitorConfig } from '@capacitor/cli';

// The native shell loads the live web app over the network (server.url) rather
// than bundling a static export — the app is SSR-heavy (server components,
// per-page auth) and can't be statically exported. In native mode the WebView
// authenticates via a locally-stored Bearer token instead of cookies.
//
// Override the loaded site per-environment with CAP_SERVER_URL. Leave unset for
// production. Examples for local testing (run `npx cap sync` after changing):
//   - Local dev servers (iOS Simulator):  CAP_SERVER_URL=http://127.0.0.1:4000
//   - Cloudflared tunnel:                 CAP_SERVER_URL=https://frontend-development.semble.cafe
const serverUrl = process.env.CAP_SERVER_URL || 'https://semble.so';
const isHttp = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.semble.app',
  appName: 'Semble',
  // Required by the CLI even when loading a remote URL. A tiny placeholder dir —
  // nothing here is served since server.url is set (see capacitor-webdir/).
  webDir: 'capacitor-webdir',
  // Marker appended to the WebView User-Agent on EVERY request, including
  // top-level document navigations (which can't carry an Authorization header).
  // The server reads this to detect native and skip cookie-based SSR auth gates,
  // deferring to the client-side Bearer-token guard. Keep in sync with
  // NATIVE_APP_UA_MARKER in lib/native/userAgent.ts.
  appendUserAgent: 'SembleNativeApp',
  server: {
    url: serverUrl,
    // Allow the WebView to navigate prod, tunnel, and local dev origins.
    allowNavigation: [
      'semble.so',
      '*.semble.so',
      '*.semble.cafe',
      'localhost',
      '127.0.0.1',
    ],
    // Plain HTTP (local dev) must be permitted; iOS blocks cleartext otherwise.
    cleartext: isHttp,
  },
  ios: {
    // Match the WKWebView scheme; the OAuth deep link is com.semble.app://auth.
    scheme: 'Semble',
  },
  plugins: {
    // Custom URL scheme handling is configured natively (Info.plist /
    // AndroidManifest intent-filter) for com.semble.app://auth deep links.
  },
};

export default config;
