import { Controller } from "../../../../../shared/infrastructure/http/Controller";
import { Response } from "express";
import { AddCardToCollectionUseCase } from "../../../application/useCases/commands/AddCardToCollectionUseCase";
import { AuthenticatedRequest } from "../../../../../shared/infrastructure/http/middleware/AuthMiddleware";

export class AddCardToCollectionController extends Controller {
  constructor(private addCardToCollectionUseCase: AddCardToCollectionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { cardId, collectionIds } = req.body;
      const curatorId = req.did;
      
      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!cardId) {
        return this.badRequest(res, "Card ID is required");
      }

      if (!collectionIds || !Array.isArray(collectionIds)) {
        return this.badRequest(res, "Collection IDs array is required");
      }

      const result = await this.addCardToCollectionUseCase.execute({
        cardId,
        collectionIds,
        curatorId,
      });

      if (result.isErr()) {
        return this.fail(res, result.error as any);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
