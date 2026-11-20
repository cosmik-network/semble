import { CardTypeEnum } from '../../../domain/value-objects/CardType';

const VALID_TYPES = new Set<string>(Object.values(CardTypeEnum));

/**
 * Parses a `cardTypes` query param into card types. Accepts a single value
 * ('URL'), a comma-separated list ('URL,ANNOTATION'), or repeated params
 * (?cardTypes=URL&cardTypes=ANNOTATION). Returns undefined (URL-only default)
 * when absent or empty.
 */
export function parseCardTypesQuery(raw: unknown): CardTypeEnum[] | undefined {
  const values: unknown[] = Array.isArray(raw) ? raw : [raw];

  const types = values
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && VALID_TYPES.has(v)) as CardTypeEnum[];

  return types.length > 0 ? types : undefined;
}
