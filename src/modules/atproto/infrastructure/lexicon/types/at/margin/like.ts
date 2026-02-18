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
const id = 'at.margin.like';

export interface Record {
  $type: 'at.margin.like';
  createdAt: string;
  subject: SubjectRef;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

export interface SubjectRef {
  $type?: 'at.margin.like#subjectRef';
  cid: string;
  uri: string;
}

const hashSubjectRef = 'subjectRef';

export function isSubjectRef<V>(v: V) {
  return is$typed(v, id, hashSubjectRef);
}

export function validateSubjectRef<V>(v: V) {
  return validate<SubjectRef & V>(v, id, hashSubjectRef);
}
