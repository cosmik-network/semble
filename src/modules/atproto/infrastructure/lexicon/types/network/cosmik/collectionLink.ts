/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon';
import { CID } from 'multiformats/cid';
import { validate as _validate } from '../../../lexicons';
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../util';
import type * as ComAtprotoRepoStrongRef from '../../com/atproto/repo/strongRef.js';
import type * as NetworkCosmikDefs from './defs.js';

const is$typed = _is$typed,
  validate = _validate;
const id = 'network.cosmik.collectionLink';

export interface Record {
  $type: 'network.cosmik.collectionLink';
  collection: ComAtprotoRepoStrongRef.Main;
  card: ComAtprotoRepoStrongRef.Main;
  originalCard?: ComAtprotoRepoStrongRef.Main;
  /** DID of the user who added the card to the collection */
  addedBy: string;
  /** Timestamp when the card was added to the collection. */
  addedAt: string;
  /** Timestamp when this link record was created (usually set by PDS). */
  createdAt?: string;
  provenance?: NetworkCosmikDefs.Provenance;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
