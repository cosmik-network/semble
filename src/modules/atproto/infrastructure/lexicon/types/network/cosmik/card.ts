/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as ComAtprotoRepoStrongRef from '../../com/atproto/repo/strongRef.js'
import type * as NetworkCosmikDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'network.cosmik.card'

export interface Record {
  $type: 'network.cosmik.card'
  /** The type of card */
  type: 'URL' | 'NOTE' | (string & {})
  content: $Typed<UrlContent> | $Typed<NoteContent> | { $type: string }
  /** Optional URL associated with the card. Required for URL cards, optional for NOTE cards. */
  url?: string
  parentCard?: ComAtprotoRepoStrongRef.Main
  /** Timestamp when this card was created (usually set by PDS). */
  createdAt?: string
  originalCard?: ComAtprotoRepoStrongRef.Main
  provenance?: NetworkCosmikDefs.Provenance
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

/** Content structure for a URL card. */
export interface UrlContent {
  $type?: 'network.cosmik.card#urlContent'
  /** The URL being saved */
  url: string
  metadata?: UrlMetadata
}

const hashUrlContent = 'urlContent'

export function isUrlContent<V>(v: V) {
  return is$typed(v, id, hashUrlContent)
}

export function validateUrlContent<V>(v: V) {
  return validate<UrlContent & V>(v, id, hashUrlContent)
}

/** Content structure for a note card. */
export interface NoteContent {
  $type?: 'network.cosmik.card#noteContent'
  /** The note text content */
  text: string
}

const hashNoteContent = 'noteContent'

export function isNoteContent<V>(v: V) {
  return is$typed(v, id, hashNoteContent)
}

export function validateNoteContent<V>(v: V) {
  return validate<NoteContent & V>(v, id, hashNoteContent)
}

/** Metadata about a URL. */
export interface UrlMetadata {
  $type?: 'network.cosmik.card#urlMetadata'
  /** Title of the page */
  title?: string
  /** Description of the page */
  description?: string
  /** Author of the content */
  author?: string
  /** When the content was published */
  publishedDate?: string
  /** Name of the site */
  siteName?: string
  /** URL of a representative image */
  imageUrl?: string
  /** Type of content (e.g., 'video', 'article') */
  type?: string
  /** When the metadata was retrieved */
  retrievedAt?: string
  /** Digital Object Identifier (DOI) for academic content */
  doi?: string
  /** International Standard Book Number (ISBN) for books */
  isbn?: string
}

const hashUrlMetadata = 'urlMetadata'

export function isUrlMetadata<V>(v: V) {
  return is$typed(v, id, hashUrlMetadata)
}

export function validateUrlMetadata<V>(v: V) {
  return validate<UrlMetadata & V>(v, id, hashUrlMetadata)
}
