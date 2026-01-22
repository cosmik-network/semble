/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'network.cosmik.collection'

export interface Record {
  $type: 'network.cosmik.collection'
  /** Name of the collection */
  name: string
  /** Description of the collection */
  description?: string
  /** Access control for the collection */
  accessType: 'OPEN' | 'CLOSED' | (string & {})
  /** List of collaborator DIDs who can add cards to closed collections */
  collaborators?: string[]
  /** Timestamp when this collection was created (usually set by PDS). */
  createdAt?: string
  /** Timestamp when this collection was last updated. */
  updatedAt?: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
