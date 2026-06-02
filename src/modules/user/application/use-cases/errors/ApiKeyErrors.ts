import { UseCaseError } from 'src/shared/core/UseCaseError';

export namespace ApiKeyErrors {
  export class ApiKeyNotFoundError extends UseCaseError {
    constructor() {
      super('API key not found');
    }
  }
}
