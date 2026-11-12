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

const is$typed = _is$typed,
  validate = _validate;
const id = 'network.cosmik.canvas';

export interface Record {
  $type: 'network.cosmik.canvas';
  /** Name of the canvas. */
  name: string;
  /** URL where the canvas can be opened. */
  url: string;
  /** Timestamp when this canvas was created. */
  createdAt?: string;
  /** Timestamp when this canvas was last updated. */
  updatedAt?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
