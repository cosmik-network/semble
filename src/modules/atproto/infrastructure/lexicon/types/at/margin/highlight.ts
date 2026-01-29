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
import type * as AtMarginAnnotation from './annotation.js';

const is$typed = _is$typed,
  validate = _validate;
const id = 'at.margin.highlight';

export interface Record {
  $type: 'at.margin.highlight';
  /** Highlight color (hex or named) */
  color?: string;
  createdAt: string;
  /** Tags for categorization */
  tags?: string[];
  target: AtMarginAnnotation.Target;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
