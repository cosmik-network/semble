import { z } from 'zod';
import { UrlCardWithCollectionsAndLibrariesSchema } from '../../entities/card';

export const GetUrlCardViewResponseSchema =
  UrlCardWithCollectionsAndLibrariesSchema;
export type GetUrlCardViewResponse = z.infer<
  typeof GetUrlCardViewResponseSchema
>;
