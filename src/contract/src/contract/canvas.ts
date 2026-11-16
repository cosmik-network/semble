import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { paths } from '@semble/types';
import {
  CreateCanvasRequestSchema,
  CreateCanvasResponseSchema,
  ListCanvasesQuerySchema,
  ListCanvasesResponseSchema,
  GetCanvasQuerySchema,
  GetCanvasResponseSchema,
  RenameCanvasRequestSchema,
  RenameCanvasResponseSchema,
  DuplicateCanvasRequestSchema,
  DuplicateCanvasResponseSchema,
  DeleteCanvasRequestSchema,
  DeleteCanvasResponseSchema,
  OpenCanvasQuerySchema,
  OpenCanvasResponseSchema,
  SaveCanvasRequestSchema,
  SaveCanvasResponseSchema,
  SaveCanvasConflictSchema,
  SaveThumbnailRequestSchema,
  SaveThumbnailResponseSchema,
  GetThumbnailQuerySchema,
  GetThumbnailResponseSchema,
  ShareCanvasRequestSchema,
  ShareCanvasResponseSchema,
  UnshareCanvasRequestSchema,
  UnshareCanvasResponseSchema,
  OpenSharedCanvasQuerySchema,
  OpenSharedCanvasResponseSchema,
  GetSharedThumbnailQuerySchema,
  GetSharedThumbnailResponseSchema,
} from '@semble/types';

const c = initContract();

export const canvasContract = c.router(
  {
    create: {
      method: 'POST',
      path: paths.createCanvas,
      body: CreateCanvasRequestSchema,
      responses: { 200: CreateCanvasResponseSchema },
      summary: 'Create a canvas',
      metadata: { internal: true } as const,
      description:
        'Creates a canvas board owned by the authenticated user. Accepts a client-generated id so boards created offline keep their identity when synced.',
    },
    list: {
      method: 'GET',
      path: paths.listCanvases,
      query: ListCanvasesQuerySchema,
      responses: { 200: ListCanvasesResponseSchema },
      summary: "List the authenticated user's canvases",
      metadata: { internal: true } as const,
      description:
        "Returns the authenticated user's canvas boards, most recently updated first. Thumbnails (image data URLs) are included only when `includeThumbnails` is true.",
    },
    get: {
      method: 'GET',
      path: paths.getCanvas,
      query: GetCanvasQuerySchema,
      responses: { 200: GetCanvasResponseSchema },
      summary: 'Get a canvas record',
      metadata: { internal: true } as const,
      description:
        "Returns one canvas's metadata, without its document or thumbnail.",
    },
    rename: {
      method: 'POST',
      path: paths.renameCanvas,
      body: RenameCanvasRequestSchema,
      responses: { 200: RenameCanvasResponseSchema },
      summary: 'Rename a canvas',
      metadata: { internal: true } as const,
      description: "Renames one of the authenticated user's canvases.",
    },
    duplicate: {
      method: 'POST',
      path: paths.duplicateCanvas,
      body: DuplicateCanvasRequestSchema,
      responses: { 200: DuplicateCanvasResponseSchema },
      summary: 'Duplicate a canvas',
      metadata: { internal: true } as const,
      description:
        "Copies one of the authenticated user's canvases: a new record plus a copy of its document and thumbnail. The copy's revision starts at 0.",
    },
    delete: {
      method: 'POST',
      path: paths.deleteCanvas,
      body: DeleteCanvasRequestSchema,
      responses: { 200: DeleteCanvasResponseSchema },
      summary: 'Delete a canvas',
      metadata: { internal: true } as const,
      description:
        "Deletes one of the authenticated user's canvases and its stored document and thumbnail.",
    },
    open: {
      method: 'GET',
      path: paths.openCanvas,
      query: OpenCanvasQuerySchema,
      responses: { 200: OpenCanvasResponseSchema },
      summary: 'Open a canvas',
      metadata: { internal: true } as const,
      description:
        "Returns a canvas's record and its saved tldraw document. The document is null when the board has never been saved. Clients compare `schemaSequences` against their running tldraw schema and refuse to edit boards saved by a newer app.",
    },
    save: {
      method: 'POST',
      path: paths.saveCanvas,
      body: SaveCanvasRequestSchema,
      responses: {
        200: SaveCanvasResponseSchema,
        // Another writer saved past baseRevision; the response names the
        // board's current revision so the client can reopen it
        409: SaveCanvasConflictSchema,
      },
      summary: 'Save a canvas document',
      metadata: { internal: true } as const,
      description:
        "Replaces the board's whole tldraw document snapshot. One writer at a time: the request names the revision it builds on, and a save that moved past it gets a 409 with the current revision.",
    },
    saveThumbnail: {
      method: 'POST',
      path: paths.saveCanvasThumbnail,
      body: SaveThumbnailRequestSchema,
      responses: { 200: SaveThumbnailResponseSchema },
      summary: "Save a canvas's thumbnail",
      metadata: { internal: true } as const,
      description:
        "Stores a JPEG data URL as the canvas's thumbnail, or removes it when null. Thumbnails never conflict with document saves.",
    },
    getThumbnail: {
      method: 'GET',
      path: paths.getCanvasThumbnail,
      query: GetThumbnailQuerySchema,
      responses: { 200: GetThumbnailResponseSchema },
      summary: "Get a canvas's thumbnail",
      metadata: { internal: true } as const,
      description:
        "Returns the canvas's thumbnail as an image data URL, or null when none was captured.",
    },
    share: {
      method: 'POST',
      path: paths.shareCanvas,
      body: ShareCanvasRequestSchema,
      responses: { 200: ShareCanvasResponseSchema },
      summary: 'Share a canvas with a view-only link',
      metadata: { internal: true } as const,
      description:
        'Creates the board’s share token and returns it, or returns the existing token when the board is already shared. Anyone holding the token can view the board.',
    },
    unshare: {
      method: 'POST',
      path: paths.unshareCanvas,
      body: UnshareCanvasRequestSchema,
      responses: { 200: UnshareCanvasResponseSchema },
      summary: 'Revoke a canvas’s view-only link',
      metadata: { internal: true } as const,
      description:
        'Clears the board’s share token. Links already handed out stop working; sharing again mints a new token.',
    },
    openShared: {
      method: 'GET',
      path: paths.openSharedCanvas,
      query: OpenSharedCanvasQuerySchema,
      responses: { 200: OpenSharedCanvasResponseSchema },
      summary: 'Open a shared canvas',
      metadata: { internal: true } as const,
      description:
        'Returns the shared board’s record and its saved tldraw document. Public: no authentication, the share token is the credential.',
    },
    getSharedThumbnail: {
      method: 'GET',
      path: paths.getSharedCanvasThumbnail,
      query: GetSharedThumbnailQuerySchema,
      responses: { 200: GetSharedThumbnailResponseSchema },
      summary: "Get a shared canvas's thumbnail",
      metadata: { internal: true } as const,
      description:
        "Returns the shared board's thumbnail as an image data URL, or null when none was captured. Public: the share token is the credential.",
    },
  },
  { strictStatusCodes: true },
);
