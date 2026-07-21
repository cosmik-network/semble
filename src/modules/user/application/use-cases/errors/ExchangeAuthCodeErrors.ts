import { UseCaseError } from 'src/shared/core/UseCaseError';

export namespace ExchangeAuthCodeErrors {
  export class CodeNotFoundError extends UseCaseError {
    constructor() {
      super('The auth code is invalid, expired, or already used');
    }
  }
}
