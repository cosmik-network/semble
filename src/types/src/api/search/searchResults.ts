import { z } from 'zod';
import { UrlViewSchema } from '../../entities/connection';
import { AnnotationCardSchema } from '../../entities/card';

/**
 * Cross-card-type search results. URL hits are UrlViews tagged with
 * cardType; annotation hits are annotation cards (the most recently updated
 * card sharing the passage) tagged with cardType and their similarity score.
 */
export const UrlSearchResultViewSchema = UrlViewSchema.extend({
  cardType: z.literal('URL'),
});
export type UrlSearchResultView = z.infer<typeof UrlSearchResultViewSchema>;

export const AnnotationSearchResultViewSchema = AnnotationCardSchema.extend({
  cardType: z.literal('ANNOTATION'),
  similarity: z.number(),
});
export type AnnotationSearchResultView = z.infer<
  typeof AnnotationSearchResultViewSchema
>;

export const CardSearchResultViewSchema = z.discriminatedUnion('cardType', [
  UrlSearchResultViewSchema,
  AnnotationSearchResultViewSchema,
]);
export type CardSearchResultView = z.infer<typeof CardSearchResultViewSchema>;

export const CardTypeFilterSchema = z.enum(['URL', 'ANNOTATION']);
export type CardTypeFilter = z.infer<typeof CardTypeFilterSchema>;
