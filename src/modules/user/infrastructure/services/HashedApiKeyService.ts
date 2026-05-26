import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Result, err, ok } from 'src/shared/core/Result';
import {
  ApiKeyMaterial,
  IApiKeyService,
} from '../../application/services/IApiKeyService';
import {
  ApiKeyRecord,
  IApiKeyRepository,
} from '../../domain/repositories/IApiKeyRepository';

const TOKEN_PREFIX = 'sk_';
const TOKEN_RANDOM_BYTES = 24;
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 8;

export class HashedApiKeyService implements IApiKeyService {
  constructor(private apiKeyRepository: IApiKeyRepository) {}

  generate(): ApiKeyMaterial {
    const random = randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
    const token = `${TOKEN_PREFIX}${random}`;
    return {
      id: uuidv4(),
      token,
      prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      tokenHash: this.hashToken(token),
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async verify(token: string): Promise<Result<ApiKeyRecord | null>> {
    if (!token.startsWith(TOKEN_PREFIX)) {
      return ok(null);
    }

    const findResult = await this.apiKeyRepository.findByTokenHash(
      this.hashToken(token),
    );
    if (findResult.isErr()) return err(findResult.error);

    const record = findResult.value;
    if (!record || record.revoked) return ok(null);
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      return ok(null);
    }

    return ok(record);
  }
}
