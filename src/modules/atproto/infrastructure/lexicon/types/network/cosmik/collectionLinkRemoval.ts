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

const is$typed = _is$typed,
  validate = _validate;
const id = 'network.cosmik.collectionLinkRemoval';

export interface Record {
  $type: 'network.cosmik.collectionLinkRemoval';
  collection: ComAtprotoRepoStrongRef.Main;
  removedLink: ComAtprotoRepoStrongRef.Main;
  /** Timestamp when the link was removed from the collection. */
  removedAt: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
