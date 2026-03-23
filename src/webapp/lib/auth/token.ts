import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';

export const isTokenExpiringSoon = (
  token: string | null | undefined,
): boolean => {
  if (!token) return true;

  const bufferSeconds = parseInt(
    process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS || '300',
    10,
  );

  try {
    // Validate JWT structure first
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const userDid = payload.did || 'unknown';

    // Ensure exp claim exists and is a number
    if (!payload.exp || typeof payload.exp !== 'number') return true;

    const expiry = payload.exp * 1000;
    const bufferTime = bufferSeconds * 1000;
    const isExpiring = Date.now() >= expiry - bufferTime;

    if (isExpiring && ENABLE_AUTH_LOGGING) {
      console.log(
        `[isTokenExpiringSoon] Token expiring soon for user: ${userDid}`,
      );
    }

    return isExpiring;
  } catch {
    return true;
  }
};
