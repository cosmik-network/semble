import { createServerApiClient } from '@/api-client/ApiClient';
import { ServerCookieAuthService } from './auth/CookieAuthService.server';

export const createServerSembleClient = async () => {
  const { accessToken } = await ServerCookieAuthService.getTokens();
  return createServerApiClient(accessToken || undefined);
};
