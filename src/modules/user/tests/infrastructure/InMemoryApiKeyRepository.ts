import { Result, ok, err } from 'src/shared/core/Result';
import {
  ApiKeyRecord,
  IApiKeyRepository,
} from '../../domain/repositories/IApiKeyRepository';

export class InMemoryApiKeyRepository implements IApiKeyRepository {
  private static instance: InMemoryApiKeyRepository;
  private keys: Map<string, ApiKeyRecord> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryApiKeyRepository {
    if (!InMemoryApiKeyRepository.instance) {
      InMemoryApiKeyRepository.instance = new InMemoryApiKeyRepository();
    }
    return InMemoryApiKeyRepository.instance;
  }

  async save(key: ApiKeyRecord): Promise<Result<void>> {
    try {
      this.keys.set(key.id, { ...key });
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async listByUser(userDid: string): Promise<Result<ApiKeyRecord[]>> {
    try {
      const results = Array.from(this.keys.values())
        .filter((k) => k.userDid === userDid && !k.revoked)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((k) => ({ ...k }));
      return ok(results);
    } catch (error: any) {
      return err(error);
    }
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      for (const key of this.keys.values()) {
        if (key.tokenHash === tokenHash && !key.revoked) {
          return ok({ ...key });
        }
      }
      return ok(null);
    } catch (error: any) {
      return err(error);
    }
  }

  async findByIdForUser(
    id: string,
    userDid: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      const key = this.keys.get(id);
      if (!key || key.userDid !== userDid) return ok(null);
      return ok({ ...key });
    } catch (error: any) {
      return err(error);
    }
  }

  async updateName(
    id: string,
    userDid: string,
    name: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      const key = this.keys.get(id);
      if (!key || key.userDid !== userDid || key.revoked) return ok(null);
      const updated = { ...key, name };
      this.keys.set(id, updated);
      return ok({ ...updated });
    } catch (error: any) {
      return err(error);
    }
  }

  async touchLastUsed(id: string, when: Date): Promise<Result<void>> {
    try {
      const key = this.keys.get(id);
      if (key) {
        this.keys.set(id, { ...key, lastUsedAt: when });
      }
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async revoke(id: string, userDid: string): Promise<Result<boolean>> {
    try {
      const key = this.keys.get(id);
      if (!key || key.userDid !== userDid || key.revoked) return ok(false);
      this.keys.set(id, { ...key, revoked: true });
      return ok(true);
    } catch (error: any) {
      return err(error);
    }
  }

  clear(): void {
    this.keys.clear();
  }
}
