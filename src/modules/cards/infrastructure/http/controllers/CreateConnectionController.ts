import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { CreateConnectionUseCase } from '../../../application/useCases/commands/CreateConnectionUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class CreateConnectionController extends Controller {
  constructor(private createConnectionUseCase: CreateConnectionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const {
        sourceType,
        sourceValue,
        targetType,
        targetValue,
        connectionType,
        note,
      } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!sourceType || !sourceValue) {
        return this.badRequest(res, 'Source type and value are required');
      }

      if (!targetType || !targetValue) {
        return this.badRequest(res, 'Target type and value are required');
      }

      // Validate source and target types
      if (!['URL', 'CARD'].includes(sourceType)) {
        return this.badRequest(res, 'Invalid source type. Must be URL or CARD');
      }

      if (!['URL', 'CARD'].includes(targetType)) {
        return this.badRequest(res, 'Invalid target type. Must be URL or CARD');
      }

      // Validate connectionType if provided
      if (
        connectionType !== undefined &&
        !['CITATION', 'REFERENCE', 'RELATED', 'INSPIRED_BY'].includes(
          connectionType,
        )
      ) {
        return this.badRequest(
          res,
          'Invalid connectionType. Must be CITATION, REFERENCE, RELATED, or INSPIRED_BY',
        );
      }

      const result = await this.createConnectionUseCase.execute({
        sourceType,
        sourceValue,
        targetType,
        targetValue,
        connectionType,
        note,
        curatorId,
      });

      if (result.isErr()) {
        // Check if the error is an authentication error
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.created(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
