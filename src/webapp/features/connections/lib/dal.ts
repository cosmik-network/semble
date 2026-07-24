import { verifySessionOnClient, logoutUser } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import {
  GetConnectionsForUrlParams,
  GetConnectionsParams,
  SearchUrlsParams,
  ConnectionType,
  UpdateConnectionRequest,
  DeleteConnectionRequest,
} from '@semble/types';
import { cache } from 'react';

export const createConnection = cache(
  async (params: {
    sourceUrl: string;
    targetUrl: string;
    connectionType?: ConnectionType;
    note?: string;
  }) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.createConnection(params);
      return response;
    } catch (error) {}
  },
);

export const getConnectionsForUrl = cache(
  async (params: GetConnectionsForUrlParams) => {
    const client = createSembleClient();
    const response = await client.getConnectionsForUrl(params);
    return response;
  },
);

export const searchUrls = cache(async (params: SearchUrlsParams) => {
  const client = createSembleClient();
  const response = await client.searchUrls(params);
  return response;
});

export const updateConnection = cache(
  async (request: UpdateConnectionRequest) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.updateConnection(request);
      return response;
    } catch (error) {
      throw error;
    }
  },
);

export const deleteConnection = cache(
  async (request: DeleteConnectionRequest) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.deleteConnection(request);
      return response;
    } catch (error) {
      throw error;
    }
  },
);

export const getUserConnections = cache(
  async (params: GetConnectionsParams) => {
    const client = createSembleClient();
    const response = await client.getConnections(params);
    return response;
  },
);
