import { BaseClient } from './BaseClient';
import {
  CreateConnectionRequest,
  CreateConnectionResponse,
  UpdateConnectionRequest,
  UpdateConnectionResponse,
  DeleteConnectionRequest,
  DeleteConnectionResponse,
  ConnectionType,
} from '@semble/types';

export class ConnectionClient extends BaseClient {
  async createConnection(params: {
    sourceUrl: string;
    targetUrl: string;
    connectionType?: ConnectionType;
    note?: string;
  }): Promise<CreateConnectionResponse> {
    try {
      // Transform simplified params to full request format
      const request: CreateConnectionRequest = {
        sourceType: 'URL',
        sourceValue: params.sourceUrl,
        targetType: 'URL',
        targetValue: params.targetUrl,
        connectionType: params.connectionType,
        note: params.note,
      };

      console.log(
        'Creating connection with request:',
        JSON.stringify(request, null, 2),
      );
      const response = await this.request<CreateConnectionResponse>(
        'POST',
        '/api/connections',
        request,
      );
      console.log(
        'CreateConnectionResponse:',
        JSON.stringify(response, null, 2),
      );
      return response;
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  }

  async updateConnection(
    request: UpdateConnectionRequest,
  ): Promise<UpdateConnectionResponse> {
    return this.request<UpdateConnectionResponse>(
      'PUT',
      `/api/connections/${request.connectionId}`,
      {
        note: request.note,
        removeNote: request.removeNote,
      },
    );
  }

  async deleteConnection(
    request: DeleteConnectionRequest,
  ): Promise<DeleteConnectionResponse> {
    return this.request<DeleteConnectionResponse>(
      'DELETE',
      `/api/connections/${request.connectionId}`,
    );
  }
}
