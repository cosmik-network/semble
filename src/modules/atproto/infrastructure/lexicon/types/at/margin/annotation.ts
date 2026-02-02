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
const id = 'at.margin.annotation';

/** Annotation body - the content of the annotation */
export interface Body {
  $type?: 'at.margin.annotation#body';
  /** MIME type of the body content */
  format: string;
  /** BCP47 language tag */
  language?: string;
  /** Reference to external body content */
  uri?: string;
  /** Text content of the annotation */
  value?: string;
}

const hashBody = 'body';

export function isBody<V>(v: V) {
  return is$typed(v, id, hashBody);
}

export function validateBody<V>(v: V) {
  return validate<Body & V>(v, id, hashBody);
}

/** W3C CssSelector - select DOM elements by CSS selector */
export interface CssSelector {
  $type?: 'at.margin.annotation#cssSelector';
  type?: 'CssSelector';
  /** CSS selector string */
  value: string;
}

const hashCssSelector = 'cssSelector';

export function isCssSelector<V>(v: V) {
  return is$typed(v, id, hashCssSelector);
}

export function validateCssSelector<V>(v: V) {
  return validate<CssSelector & V>(v, id, hashCssSelector);
}

/** W3C FragmentSelector - select by URI fragment */
export interface FragmentSelector {
  $type?: 'at.margin.annotation#fragmentSelector';
  /** Specification the fragment conforms to */
  conformsTo?: string;
  type?: 'FragmentSelector';
  /** Fragment identifier value */
  value: string;
}

const hashFragmentSelector = 'fragmentSelector';

export function isFragmentSelector<V>(v: V) {
  return is$typed(v, id, hashFragmentSelector);
}

export function validateFragmentSelector<V>(v: V) {
  return validate<FragmentSelector & V>(v, id, hashFragmentSelector);
}

export interface Record {
  $type: 'at.margin.annotation';
  body?: Body;
  createdAt: string;
  /** W3C motivation for the annotation */
  motivation?:
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

/** W3C RangeSelector - select range between two selectors */
export interface RangeSelector {
  $type?: 'at.margin.annotation#rangeSelector';
  endSelector:
    | $Typed<TextQuoteSelector>
    | $Typed<TextPositionSelector>
    | $Typed<CssSelector>
    | $Typed<XpathSelector>
    | { $type: string };
  startSelector:
    | $Typed<TextQuoteSelector>
    | $Typed<TextPositionSelector>
    | $Typed<CssSelector>
    | $Typed<XpathSelector>
    | { $type: string };
  type?: 'RangeSelector';
}

const hashRangeSelector = 'rangeSelector';

export function isRangeSelector<V>(v: V) {
  return is$typed(v, id, hashRangeSelector);
}

export function validateRangeSelector<V>(v: V) {
  return validate<RangeSelector & V>(v, id, hashRangeSelector);
}

/** W3C SpecificResource - the target with optional selector */
export interface Target {
  $type?: 'at.margin.annotation#target';
  selector?:
    | $Typed<TextQuoteSelector>
    | $Typed<TextPositionSelector>
    | $Typed<CssSelector>
    | $Typed<XpathSelector>
    | $Typed<FragmentSelector>
    | $Typed<RangeSelector>
    | { $type: string };
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

/** W3C TextPositionSelector - select by character offsets */
export interface TextPositionSelector {
  $type?: 'at.margin.annotation#textPositionSelector';
  /** Ending character position (exclusive) */
  end: number;
  /** Starting character position (0-indexed, inclusive) */
  start: number;
  type?: 'TextPositionSelector';
}

const hashTextPositionSelector = 'textPositionSelector';

export function isTextPositionSelector<V>(v: V) {
  return is$typed(v, id, hashTextPositionSelector);
}

export function validateTextPositionSelector<V>(v: V) {
  return validate<TextPositionSelector & V>(v, id, hashTextPositionSelector);
}

/** W3C TextQuoteSelector - select text by quoting it with context */
export interface TextQuoteSelector {
  $type?: 'at.margin.annotation#textQuoteSelector';
  /** The exact text to match */
  exact: string;
  /** Text immediately before the selection */
  prefix?: string;
  /** Text immediately after the selection */
  suffix?: string;
  type?: 'TextQuoteSelector';
}

const hashTextQuoteSelector = 'textQuoteSelector';

export function isTextQuoteSelector<V>(v: V) {
  return is$typed(v, id, hashTextQuoteSelector);
}

export function validateTextQuoteSelector<V>(v: V) {
  return validate<TextQuoteSelector & V>(v, id, hashTextQuoteSelector);
}

/** W3C TimeState - record when content was captured */
export interface TimeState {
  $type?: 'at.margin.annotation#timeState';
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

/** W3C XPathSelector - select by XPath expression */
export interface XpathSelector {
  $type?: 'at.margin.annotation#xpathSelector';
  type?: 'XPathSelector';
  /** XPath expression */
  value: string;
}

const hashXpathSelector = 'xpathSelector';

export function isXpathSelector<V>(v: V) {
  return is$typed(v, id, hashXpathSelector);
}

export function validateXpathSelector<V>(v: V) {
  return validate<XpathSelector & V>(v, id, hashXpathSelector);
}
