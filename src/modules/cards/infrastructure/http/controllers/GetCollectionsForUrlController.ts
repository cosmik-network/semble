import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { z } from 'zod';
import { GetCollectionsForUrlUseCase } from '../../../application/useCases/queries/GetCollectionsForUrlUseCase';
import { GetCollectionsForUrlResponse } from '@semble/types';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';

// Zod schema for request validation
const querySchema = z.object({
  url: z.string().min(1, 'URL is required'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'cardCount', 'addedAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export class GetCollectionsForUrlController extends Controller {
  constructor(
    private getCollectionsForUrlUseCase: GetCollectionsForUrlUseCase,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      // Validate request with Zod
      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        return this.badRequest(res, JSON.stringify(validation.error.format()));
      }

      const params = validation.data;

      const result = await this.getCollectionsForUrlUseCase.execute({
        url: params.url,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy as CollectionSortField | undefined,
        sortOrder: params.sortOrder as SortOrder | undefined,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok<GetCollectionsForUrlResponse>(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
