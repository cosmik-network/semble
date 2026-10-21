import { createShapeId, TLShapeId } from 'tldraw';

// The first copy of a card keeps this id; later copies get random ones
export const cardShapeId = (url: string) => createShapeId(`card:${url}`);

// One arrow per connection and pair of copies it joins
export const connectionArrowId = (
  connectionId: string,
  sourceId: TLShapeId,
  targetId: TLShapeId,
) => createShapeId(`connection:${connectionId}:${sourceId}:${targetId}`);

export const canvasPersistenceKey = (userId: string, scope: string) =>
  `semble-canvas:v1:${userId}:${scope}`;
