import { Result } from 'src/shared/core/Result';

export interface IFirehoseCursorRepository {
  getCursor(): Promise<Result<number | null>>;
  saveCursor(timeUs: number): Promise<Result<void>>;
}
