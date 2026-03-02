import { BaseClient } from './BaseClient';
import {
  CreateConnectionRequest,
  CreateConnectionResponse,
  UpdateConnectionRequest,
  UpdateConnectionResponse,
  DeleteConnectionRequest,
  DeleteConnectionResponse,
} from '@semble/types';

export class ConnectionClient extends BaseClient {
  async createConnection(
    request: CreateConnectionRequest,
  ): Promise<CreateConnectionResponse> {
    try {
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
  //   return this.request<CreateConnectionResponse>(
  //     'POST',
  //     '/api/connections',
  //     request,
  //   );
  // }

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
