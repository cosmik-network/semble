import { Result, ok, err } from 'src/shared/core/Result';
import {
  IAppPasswordSessionRepository,
  SessionWithAppPassword,
} from '../../infrastructure/repositories/IAppPasswordSessionRepository';

export class InMemoryAppPasswordSessionRepository implements IAppPasswordSessionRepository {
  private static instance: InMemoryAppPasswordSessionRepository;
  private sessions: Map<string, SessionWithAppPassword> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryAppPasswordSessionRepository {
    if (!InMemoryAppPasswordSessionRepository.instance) {
      InMemoryAppPasswordSessionRepository.instance =
        new InMemoryAppPasswordSessionRepository();
    }
    return InMemoryAppPasswordSessionRepository.instance;
  }

  async saveSession(
    did: string,
    session: SessionWithAppPassword,
  ): Promise<Result<void>> {
    try {
      this.sessions.set(did, session);
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async getSession(
    did: string,
  ): Promise<Result<SessionWithAppPassword | null>> {
    try {
      const session = this.sessions.get(did) || null;
      return ok(session);
    } catch (error: any) {
      return err(error);
    }
  }

  // Test utility methods
  clear(): void {
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}
