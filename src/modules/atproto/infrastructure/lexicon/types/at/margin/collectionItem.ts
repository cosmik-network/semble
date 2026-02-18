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
const id = 'at.margin.collectionItem';

export interface Record {
  $type: 'at.margin.collectionItem';
  /** AT URI of the annotation, highlight, or bookmark */
  annotation: string;
  /** AT URI of the collection */
  collection: string;
  createdAt: string;
  /** Sort order within the collection */
  position?: number;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
