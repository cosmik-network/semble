import type { JsonObject } from 'tldraw';

// Server data can leave fields undefined, such as a user's avatar, which
// tldraw refuses in a shape's meta
export const jsonMeta = (value: object) =>
  JSON.parse(JSON.stringify(value)) as JsonObject;
