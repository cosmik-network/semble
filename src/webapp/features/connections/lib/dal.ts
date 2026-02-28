import { verifySessionOnClient, logoutUser } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import {
  CreateConnectionRequest,
  GetForwardConnectionsForUrlParams,
  GetBackwardConnectionsForUrlParams,
} from '@semble/types';
import { cache } from 'react';

export const createConnection = cache(
  async (request: CreateConnectionRequest) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.createConnection(request);
      return response;
    } catch (error) {
      await logoutUser();
    }
  },
);

export const getForwardConnectionsForUrl = cache(
  async (params: GetForwardConnectionsForUrlParams) => {
    const client = createSembleClient();
    const response = await client.getForwardConnectionsForUrl(params);
    return response;
  },
);

export const getBackwardConnectionsForUrl = cache(
  async (params: GetBackwardConnectionsForUrlParams) => {
    const client = createSembleClient();
    const response = await client.getBackwardConnectionsForUrl(params);
    return response;
  },
);
