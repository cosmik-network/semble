import { ApiClient } from '@/api-client/ApiClient';
import {
  createClientTokenManager,
  createServerTokenManager,
} from '@/services/auth';

export const createServerSideApiClient = async () => {
  const tokenManager = await createServerTokenManager();

  return new ApiClient(
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    tokenManager,
  );
};

export const createClientSideApiClient = () => {
  const tokenManager = createClientTokenManager();

  return new ApiClient(
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    tokenManager,
  );
};

export const createApiClient = async () => {
  if (typeof window === 'undefined') {
    return await createServerSideApiClient();
  } else {
    return createClientSideApiClient();
  }
};
