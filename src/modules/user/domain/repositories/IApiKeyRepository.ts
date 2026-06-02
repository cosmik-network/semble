import { Result } from 'src/shared/core/Result';

export interface ApiKeyRecord {
  id: string;
  userDid: string;
  name: string;
  prefix: string;
  tokenHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
}

export interface IApiKeyRepository {
  save(key: ApiKeyRecord): Promise<Result<void>>;
  listByUser(userDid: string): Promise<Result<ApiKeyRecord[]>>;
  findByTokenHash(tokenHash: string): Promise<Result<ApiKeyRecord | null>>;
  findByIdForUser(
    id: string,
    userDid: string,
  ): Promise<Result<ApiKeyRecord | null>>;
  updateName(
    id: string,
    userDid: string,
    name: string,
  ): Promise<Result<ApiKeyRecord | null>>;
  touchLastUsed(id: string, when: Date): Promise<Result<void>>;
  revoke(id: string, userDid: string): Promise<Result<boolean>>;
}
