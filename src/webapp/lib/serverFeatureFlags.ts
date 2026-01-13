import { getServerAuthStatus } from './serverAuth';

const APPROVED_HANDLES = ['wesleyfinck.org', 'ronentk.me', 'pouriade.com'];

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();

  const isApprovedUser = user?.handle && APPROVED_HANDLES.includes(user.handle);

  return {
    similarCards: isApprovedUser || process.env.VERCEL_ENV !== 'production',
    cardSearch: isApprovedUser || process.env.VERCEL_ENV !== 'production',
  };
}
