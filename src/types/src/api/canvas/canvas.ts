import { z } from 'zod';

export const CANVAS_SCHEMA_VERSION = 2;

// tldraw's serialized migration sequences. Opaque to the server: it stores
// them so clients can refuse to load a document a newer app migrated up.
export const CanvasSchemaSequencesSchema = z.record(z.number());
export type CanvasSchemaSequences = z.infer<typeof CanvasSchemaSequencesSchema>;

// A tldraw store snapshot: a flat map of records keyed by id. The server
// stores and returns it verbatim; only the envelope is validated.
export const CanvasDocumentSchema = z.object({
  schema: z.object({
    schemaVersion: z.literal(CANVAS_SCHEMA_VERSION),
    sequences: CanvasSchemaSequencesSchema,
  }),
  store: z.record(z.unknown()),
});
export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;

export const DEFAULT_CANVAS_NAME = 'Untitled canvas';

export const CanvasRecordSchema = z.object({
  id: z.string().uuid(),
  ownerDid: z.string(),
  name: z.string(),
  tldrawVersion: z.string(),
  linkCount: z.number().int(),
  revision: z.number().int(),
  schemaSequences: CanvasSchemaSequencesSchema,
  hasThumbnail: z.boolean(),
  // When a view-only link was last made; null while the board is unshared
  sharedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CanvasRecord = z.infer<typeof CanvasRecordSchema>;

export const CreateCanvasRequestSchema = z.object({
  // Client-generated, so boards created offline keep their id when synced
  id: z.string().uuid().optional(),
  name: z.string().optional(),
});
export type CreateCanvasRequest = z.infer<typeof CreateCanvasRequestSchema>;

export const CreateCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
});
export type CreateCanvasResponse = z.infer<typeof CreateCanvasResponseSchema>;

export const ListCanvasesQuerySchema = z.object({
  // Thumbnails are a few hundred KB each, so they're left out unless asked for
  includeThumbnails: z.coerce.boolean().optional(),
});
export type ListCanvasesQuery = z.infer<typeof ListCanvasesQuerySchema>;

export const CanvasSummarySchema = CanvasRecordSchema.extend({
  // An image data URL, null when none was captured
  thumbnail: z.string().nullable(),
});
export type CanvasSummary = z.infer<typeof CanvasSummarySchema>;

export const ListCanvasesResponseSchema = z.object({
  canvases: z.array(CanvasSummarySchema),
});
export type ListCanvasesResponse = z.infer<typeof ListCanvasesResponseSchema>;

export const GetCanvasQuerySchema = z.object({
  canvasId: z.string().uuid(),
});
export type GetCanvasQuery = z.infer<typeof GetCanvasQuerySchema>;

export const GetCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
});
export type GetCanvasResponse = z.infer<typeof GetCanvasResponseSchema>;

export const RenameCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
  name: z.string().min(1),
});
export type RenameCanvasRequest = z.infer<typeof RenameCanvasRequestSchema>;

export const RenameCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
});
export type RenameCanvasResponse = z.infer<typeof RenameCanvasResponseSchema>;

export const DuplicateCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
});
export type DuplicateCanvasRequest = z.infer<
  typeof DuplicateCanvasRequestSchema
>;

export const DuplicateCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
});
export type DuplicateCanvasResponse = z.infer<
  typeof DuplicateCanvasResponseSchema
>;

export const DeleteCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
});
export type DeleteCanvasRequest = z.infer<typeof DeleteCanvasRequestSchema>;

export const DeleteCanvasResponseSchema = z.object({});
export type DeleteCanvasResponse = z.infer<typeof DeleteCanvasResponseSchema>;

export const OpenCanvasQuerySchema = z.object({
  canvasId: z.string().uuid(),
});
export type OpenCanvasQuery = z.infer<typeof OpenCanvasQuerySchema>;

export const OpenCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
  // Null when the board has never been saved
  document: CanvasDocumentSchema.nullable(),
});
export type OpenCanvasResponse = z.infer<typeof OpenCanvasResponseSchema>;

export const SaveCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
  // The revision this save builds on. Another writer's save moved the board
  // past it → 409.
  baseRevision: z.number().int().nonnegative(),
  document: CanvasDocumentSchema,
  linkCount: z.number().int().nonnegative(),
  tldrawVersion: z.string(),
});
export type SaveCanvasRequest = z.infer<typeof SaveCanvasRequestSchema>;

export const SaveCanvasResponseSchema = z.object({
  revision: z.number().int(),
  updatedAt: z.string(),
});
export type SaveCanvasResponse = z.infer<typeof SaveCanvasResponseSchema>;

export const SaveCanvasConflictSchema = z.object({
  error: z.string(),
  currentRevision: z.number().int(),
});
export type SaveCanvasConflict = z.infer<typeof SaveCanvasConflictSchema>;

export const SaveThumbnailRequestSchema = z.object({
  canvasId: z.string().uuid(),
  // A JPEG data URL, or null to remove the thumbnail
  thumbnail: z.string().nullable(),
});
export type SaveThumbnailRequest = z.infer<typeof SaveThumbnailRequestSchema>;

export const SaveThumbnailResponseSchema = z.object({});
export type SaveThumbnailResponse = z.infer<typeof SaveThumbnailResponseSchema>;

export const GetThumbnailQuerySchema = z.object({
  canvasId: z.string().uuid(),
});
export type GetThumbnailQuery = z.infer<typeof GetThumbnailQuerySchema>;

export const GetThumbnailResponseSchema = z.object({
  thumbnail: z.string().nullable(),
});
export type GetThumbnailResponse = z.infer<typeof GetThumbnailResponseSchema>;

// A view-only link's secret. 24 base64url characters from 18 random bytes.
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24}$/;

export const ShareCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
});
export type ShareCanvasRequest = z.infer<typeof ShareCanvasRequestSchema>;

export const ShareCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
  // The token the share link carries. Returned only here: revoking and
  // sharing again rotates it
  shareToken: z.string().regex(SHARE_TOKEN_PATTERN),
});
export type ShareCanvasResponse = z.infer<typeof ShareCanvasResponseSchema>;

export const UnshareCanvasRequestSchema = z.object({
  canvasId: z.string().uuid(),
});
export type UnshareCanvasRequest = z.infer<typeof UnshareCanvasRequestSchema>;

export const UnshareCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
});
export type UnshareCanvasResponse = z.infer<typeof UnshareCanvasResponseSchema>;

export const OpenSharedCanvasQuerySchema = z.object({
  // No z.uuid: the token is the address, and a wrong one is a 404
  shareToken: z.string().regex(SHARE_TOKEN_PATTERN),
});
export type OpenSharedCanvasQuery = z.infer<typeof OpenSharedCanvasQuerySchema>;

export const OpenSharedCanvasResponseSchema = z.object({
  canvas: CanvasRecordSchema,
  // Null when the board has never been saved
  document: CanvasDocumentSchema.nullable(),
});
export type OpenSharedCanvasResponse = z.infer<
  typeof OpenSharedCanvasResponseSchema
>;
