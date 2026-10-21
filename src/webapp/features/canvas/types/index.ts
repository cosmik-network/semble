import { TLShapeId } from 'tldraw';
import { ConnectionType } from '@semble/types';

export type ArrowStatus = 'pending' | 'saving' | 'saved' | 'ghost';

export interface ArrowMeta {
  status?: ArrowStatus;
  connectionId?: string;
  // The pair of copies a server arrow was drawn between
  sourceId?: TLShapeId;
  targetId?: TLShapeId;
}

export interface CanvasConnection {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  type: ConnectionType;
  note?: string;
  curatorId: string;
}
