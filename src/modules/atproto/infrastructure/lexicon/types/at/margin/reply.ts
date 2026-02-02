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
const id = 'at.margin.reply';

export interface Record {
  $type: 'at.margin.reply';
  createdAt: string;
  /** MIME type of the text content */
  format: string;
  parent: ReplyRef;
  root: ReplyRef;
  /** Reply text content */
  text: string;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

/** Strong reference to an annotation or reply */
export interface ReplyRef {
  $type?: 'at.margin.reply#replyRef';
  cid: string;
  uri: string;
}

const hashReplyRef = 'replyRef';

export function isReplyRef<V>(v: V) {
  return is$typed(v, id, hashReplyRef);
}

export function validateReplyRef<V>(v: V) {
  return validate<ReplyRef & V>(v, id, hashReplyRef);
}
