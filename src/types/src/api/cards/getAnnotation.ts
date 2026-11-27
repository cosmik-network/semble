import { z } from 'zod';
import { AnnotationCardSchema } from '../../entities/card';

export const GetAnnotationParamsSchema = z
  .object({
    /** The passage's stable content ID — takes precedence over url + exact */
    cid: z.string().optional(),
    url: z.string().optional(),
    /** Exact text of the annotation's TextQuoteSelector */
    exact: z.string().optional(),
  })
  .refine(
    (params) =>
      !!params.cid || (params.url !== undefined && params.exact !== undefined),
    { message: 'Provide either cid, or both url and exact' },
  );
export type GetAnnotationParams = z.infer<typeof GetAnnotationParamsSchema>;

export const GetAnnotationResponseSchema = z.object({
  // The passage's annotation view — entity-level counts across every card
  // matching the passage (url + normalized exact text)
  annotation: AnnotationCardSchema.optional(),
  // The passage's stable content ID (also on the annotation view)
  cid: z.string(),
  // The matched passage's raw exact text — echoed when resolved by cid, so
  // callers don't have to guess which selector the passage keyed on
  exact: z.string().optional(),
  // Collections containing any passage-matching card
  collectionCount: z.number().optional(),
  // Note-bearing cards matching the passage
  noteCount: z.number().optional(),
});
export type GetAnnotationResponse = z.infer<typeof GetAnnotationResponseSchema>;
