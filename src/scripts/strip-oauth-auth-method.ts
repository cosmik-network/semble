/**
 * One-off cutover migration for the confidential OAuth client switch.
 *
 * Stored PDS sessions record the auth method used at login, e.g.
 * {"authMethod":{"method":"none"}}. The oauth-client library reuses that
 * value verbatim on every refresh and never re-negotiates, so after the
 * client metadata flips to private_key_jwt, "none" sessions send
 * unauthenticated refreshes that the PDS rejects (invalid_client) — deleting
 * the session and force-logging the user out.
 *
 * Sessions with NO authMethod field are treated as 'legacy' and re-negotiated
 * against the current client metadata; the PDS explicitly permits a
 * public→confidential upgrade on refresh. Stripping the field therefore lets
 * every existing session upgrade in place and gain the extended (2-year)
 * session lifetime.
 *
 * Run once per environment, immediately AFTER the confidential-client deploy
 * is live (run before, and re-negotiation just picks "none" again):
 *
 *   DATABASE_URL=... node dist/scripts/strip-oauth-auth-method.js
 */
import postgres from 'postgres';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const result = await sql`
      UPDATE auth_session
      SET session = (session::jsonb - 'authMethod')::text
      WHERE session::jsonb ? 'authMethod'
    `;
    console.log(
      `Stripped authMethod from ${result.count} auth_session row(s); they will re-negotiate client auth on next refresh`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('strip-oauth-auth-method failed:', error);
  process.exit(1);
});
