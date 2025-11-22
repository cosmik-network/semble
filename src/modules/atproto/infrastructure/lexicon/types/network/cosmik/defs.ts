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
const id = 'network.cosmik.defs';

/** Represents the provenance or source of a record. */
export interface Provenance {
  $type?: 'network.cosmik.defs#provenance';
  via?: ComAtprotoRepoStrongRef.Main;
}

const hashProvenance = 'provenance';

export function isProvenance<V>(v: V) {
  return is$typed(v, id, hashProvenance);
}

export function validateProvenance<V>(v: V) {
  return validate<Provenance & V>(v, id, hashProvenance);
}
