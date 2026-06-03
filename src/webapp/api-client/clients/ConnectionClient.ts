import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
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
    const request: CreateConnectionRequest = {
      sourceType: 'URL',
      sourceValue: params.sourceUrl,
      targetType: 'URL',
      targetValue: params.targetUrl,
      connectionType: params.connectionType,
      note: params.note,
    };

    const res = await this.client.connections.createConnection({
      body: request,
    });
    return unwrap<CreateConnectionResponse>(res);
  }

  async updateConnection(
    request: UpdateConnectionRequest,
  ): Promise<UpdateConnectionResponse> {
    const res = await this.client.connections.updateConnection({
      body: {
        connectionId: request.connectionId,
        connectionType: request.connectionType,
        note: request.note,
        removeNote: request.removeNote,
        swap: request.swap,
      },
    });
    return unwrap<UpdateConnectionResponse>(res);
  }

  async deleteConnection(
    request: DeleteConnectionRequest,
  ): Promise<DeleteConnectionResponse> {
    const res = await this.client.connections.deleteConnection({
      body: { connectionId: request.connectionId },
    });
    return unwrap<DeleteConnectionResponse>(res);
  }
}
