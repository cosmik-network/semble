export class SelectorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SelectorValidationError';
  }
}
