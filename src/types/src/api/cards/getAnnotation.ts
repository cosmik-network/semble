import { z } from 'zod';
import { AnnotationCardSchema } from '../../entities/card';

export const GetAnnotationParamsSchema = z.object({
  url: z.string(),
  /** Exact text of the annotation's TextQuoteSelector */
  exact: z.string(),
});
export type GetAnnotationParams = z.infer<typeof GetAnnotationParamsSchema>;

export const GetAnnotationResponseSchema = z.object({
  // The passage's annotation view — entity-level counts across every card
  // matching the passage (url + normalized exact text)
  annotation: AnnotationCardSchema.optional(),
  // Collections containing any passage-matching card
  collectionCount: z.number().optional(),
  // Note-bearing cards matching the passage
  noteCount: z.number().optional(),
});
export type GetAnnotationResponse = z.infer<typeof GetAnnotationResponseSchema>;
