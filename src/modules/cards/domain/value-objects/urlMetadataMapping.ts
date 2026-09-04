import { UrlMetadata, UrlMetadataProps } from './UrlMetadata';
import { UrlType } from './UrlType';

/**
 * Single source of truth for moving URL metadata across layer boundaries.
 *
 * Every field of UrlMetadata is optional, so hand-written object literals that
 * forget a field compile cleanly and silently drop data. These helpers keep the
 * field list in one place; the `satisfies Required<...>` assertions below turn a
 * future omission into a compile error instead of silent loss.
 */

/** JSON shape stored in `content_data` / `*_url_metadata` JSONB columns. */
export interface UrlMetadataJSON {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  imageUrl?: string;
  type?: string;
  retrievedAt?: string;
  doi?: string;
  isbn?: string;
  atCanonical?: string[];
  atAuthors?: string[];
  atMe?: string[];
}

/** Wire shape returned by the API (dates as ISO strings), matching UrlMetadataSchema. */
export type UrlMetadataDTO = UrlMetadataJSON;

/**
 * Parse a date that may arrive as a Date, an ISO string, or a partial date.
 * Returns undefined rather than an Invalid Date so downstream arithmetic and
 * `.toISOString()` never throw.
 */
function toDate(value: Date | string | undefined | null): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Serialize a Date to RFC-3339. Guards against Invalid Date, which would
 * otherwise throw inside `.toISOString()`.
 */
function toIso(value: Date | string | undefined | null): string | undefined {
  return toDate(value)?.toISOString();
}

/** Domain value object -> persistence/wire JSON. */
export function toUrlMetadataJSON(metadata: UrlMetadata): UrlMetadataJSON {
  return {
    url: metadata.url,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    publishedDate: toIso(metadata.publishedDate),
    siteName: metadata.siteName,
    imageUrl: metadata.imageUrl,
    type: metadata.type,
    retrievedAt: toIso(metadata.retrievedAt),
    doi: metadata.doi,
    isbn: metadata.isbn,
    atCanonical: metadata.atCanonical,
    atAuthors: metadata.atAuthors,
    atMe: metadata.atMe,
  } satisfies Required<{ [K in keyof UrlMetadataJSON]: unknown }>;
}

/** Persisted/wire JSON -> plain props suitable for `UrlMetadata.create`. */
export function toUrlMetadataProps(
  json: Partial<UrlMetadataJSON> & { url: string },
): UrlMetadataProps {
  return {
    url: json.url,
    title: json.title,
    description: json.description,
    author: json.author,
    publishedDate: toDate(json.publishedDate),
    siteName: json.siteName,
    imageUrl: json.imageUrl,
    type: json.type as UrlType | undefined,
    retrievedAt: toDate(json.retrievedAt),
    doi: json.doi,
    isbn: json.isbn,
    atCanonical: json.atCanonical,
    atAuthors: json.atAuthors,
    atMe: json.atMe,
  } satisfies Required<{ [K in keyof UrlMetadataProps]: unknown }>;
}

/**
 * Persisted/wire JSON -> query-layer view, where dates are Date objects.
 * Used by the read path that bypasses the domain aggregate.
 */
export function toUrlMetadataView(
  json: Partial<UrlMetadataJSON> & { url: string },
): UrlMetadataProps {
  return toUrlMetadataProps(json);
}

/** Query-layer view (Dates) -> API DTO (ISO strings). */
export function toUrlMetadataDTO(view: {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: Date | string;
  siteName?: string;
  imageUrl?: string;
  type?: string;
  retrievedAt?: Date | string;
  doi?: string;
  isbn?: string;
  atCanonical?: string[];
  atAuthors?: string[];
  atMe?: string[];
}): UrlMetadataDTO {
  return {
    url: view.url,
    title: view.title,
    description: view.description,
    author: view.author,
    publishedDate: toIso(view.publishedDate),
    siteName: view.siteName,
    imageUrl: view.imageUrl,
    type: view.type,
    retrievedAt: toIso(view.retrievedAt),
    doi: view.doi,
    isbn: view.isbn,
    atCanonical: view.atCanonical,
    atAuthors: view.atAuthors,
    atMe: view.atMe,
  } satisfies Required<{ [K in keyof UrlMetadataDTO]: unknown }>;
}
