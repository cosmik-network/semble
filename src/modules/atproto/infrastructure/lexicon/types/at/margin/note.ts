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
import type * as AppBskyRichtextFacet from '../../app/bsky/richtext/facet.js';
import type * as ComAtprotoLabelDefs from '../../com/atproto/label/defs.js';

const is$typed = _is$typed,
  validate = _validate;
const id = 'at.margin.note';

/** Annotation body - the content of the annotation */
export interface Body {
  $type?: 'at.margin.note#body';
  /** MIME type of the body content */
  format: string;
  /** Reference to external body content */
  uri?: string;
  /** Text content of the annotation. For bookmarks, this is the description. */
  value?: string;
}

const hashBody = 'body';

export function isBody<V>(v: V) {
  return is$typed(v, id, hashBody);
}

export function validateBody<V>(v: V) {
  return validate<Body & V>(v, id, hashBody);
}

/** The client/agent that created this record */
export interface Generator {
  $type?: 'at.margin.note#generator';
  homepage?: string;
  id?: string;
  name?: string;
}

const hashGenerator = 'generator';

export function isGenerator<V>(v: V) {
  return is$typed(v, id, hashGenerator);
}

export function validateGenerator<V>(v: V) {
  return validate<Generator & V>(v, id, hashGenerator);
}

export interface Record {
  $type: 'at.margin.note';
  body?: Body;
  /** Highlight color tint */
  color?: string;
  createdAt: string;
  /** Rich text facets (e.g. mentions, links) */
  facets?: AppBskyRichtextFacet.Main[];
  generator?: Generator;
  labels?: ComAtprotoLabelDefs.SelfLabels;
  /** When this record was last modified */
  modifiedAt?: string;
  /** W3C motivation for the annotation */
  motivation:
    | 'commenting'
    | 'highlighting'
    | 'bookmarking'
    | 'tagging'
    | 'describing'
    | 'linking'
    | 'replying'
    | 'editing'
    | 'questioning'
    | 'assessing'
    | (string & {});
  /** License URI (e.g., https://creativecommons.org/licenses/by/4.0/) */
  rights?: string;
  /** Tags for categorization */
  tags?: string[];
  target: Target;
  [k: string]: unknown;
}

const hashRecord = 'main';

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

/** W3C Web Annotation Selector. The 'type' field discriminates the selector kind using W3C type names (e.g. TextQuoteSelector). This follows W3C conventions, not ATProto union $type. */
export interface Selector {
  $type?: 'at.margin.note#selector';
  /** FragmentSelector: URI of the specification the fragment conforms to */
  conformsTo?: string;
  /** TextPositionSelector: end character offset (exclusive) */
  end?: number;
  /** TextQuoteSelector: the exact text being selected */
  exact?: string;
  /** TextQuoteSelector: text immediately before the selection, for disambiguation */
  prefix?: string;
  refinedBy?: Selector;
  /** TextPositionSelector: start character offset (inclusive) */
  start?: number;
  /** TextQuoteSelector: text immediately after the selection, for disambiguation */
  suffix?: string;
  /** W3C selector type identifier */
  type:
    | 'TextQuoteSelector'
    | 'TextPositionSelector'
    | 'CssSelector'
    | 'XPathSelector'
    | 'FragmentSelector'
    | (string & {});
  /** CssSelector/XPathSelector/FragmentSelector: the selector expression or fragment value */
  value?: string;
}

const hashSelector = 'selector';

export function isSelector<V>(v: V) {
  return is$typed(v, id, hashSelector);
}

export function validateSelector<V>(v: V) {
  return validate<Selector & V>(v, id, hashSelector);
}

/** W3C SpecificResource - the target with optional selector */
export interface Target {
  $type?: 'at.margin.note#target';
  selector?: Selector;
  /** The URL being annotated */
  source: string;
  /** SHA256 hash of normalized URL for indexing */
  sourceHash?: string;
  state?: TimeState;
  /** Page title at time of annotation */
  title?: string;
}

const hashTarget = 'target';

export function isTarget<V>(v: V) {
  return is$typed(v, id, hashTarget);
}

export function validateTarget<V>(v: V) {
  return validate<Target & V>(v, id, hashTarget);
}

/** W3C TimeState - record when content was captured */
export interface TimeState {
  $type?: 'at.margin.note#timeState';
  /** URL to cached/archived version */
  cached?: string;
  /** When the source was accessed */
  sourceDate?: string;
}

const hashTimeState = 'timeState';

export function isTimeState<V>(v: V) {
  return is$typed(v, id, hashTimeState);
}

export function validateTimeState<V>(v: V) {
  return validate<TimeState & V>(v, id, hashTimeState);
}
