import { z } from 'zod';

export const UpdateNoteCardRequestSchema = z.object({
  cardId: z.string(),
  note: z.string(),
});
export type UpdateNoteCardRequest = z.infer<typeof UpdateNoteCardRequestSchema>;

export const UpdateNoteCardResponseSchema = z.object({
  cardId: z.string(),
});
export type UpdateNoteCardResponse = z.infer<
  typeof UpdateNoteCardResponseSchema
>;
