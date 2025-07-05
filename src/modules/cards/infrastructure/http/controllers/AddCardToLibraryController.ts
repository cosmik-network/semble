import { Controller } from "../../../../../shared/infrastructure/http/Controller";
import { Response } from "express";
import { AddCardToLibraryUseCase } from "../../../application/useCases/commands/AddCardToLibraryUseCase";
import { AuthenticatedRequest } from "../../../../../shared/infrastructure/http/middleware/AuthMiddleware";

export class AddCardToLibraryController extends Controller {
  constructor(private addCardToLibraryUseCase: AddCardToLibraryUseCase) {
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

      // collectionIds is optional, but if provided should be an array
      if (collectionIds !== undefined && !Array.isArray(collectionIds)) {
        return this.badRequest(res, "Collection IDs must be an array");
      }

      const result = await this.addCardToLibraryUseCase.execute({
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
