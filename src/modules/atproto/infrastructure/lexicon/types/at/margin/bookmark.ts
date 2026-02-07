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
const id = 'at.margin.bookmark';

export interface Record {
  $type: 'at.margin.bookmark';
  createdAt: string;
  /** Optional description/note */
  description?: string;
  /** The bookmarked URL */
  source: string;
  /** SHA256 hash of normalized URL for indexing */
  sourceHash?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Page title */
  title?: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}
