import { CreateApiKeyUseCase } from '../../application/use-cases/CreateApiKeyUseCase';
import { RevokeApiKeyUseCase } from '../../application/use-cases/RevokeApiKeyUseCase';
import { ApiKeyErrors } from '../../application/use-cases/errors/ApiKeyErrors';
import { HashedApiKeyService } from '../../infrastructure/services/HashedApiKeyService';
import { InMemoryApiKeyRepository } from '../infrastructure/InMemoryApiKeyRepository';

describe('API key use cases', () => {
  let repository: InMemoryApiKeyRepository;
  let service: HashedApiKeyService;
  let createUseCase: CreateApiKeyUseCase;
  let revokeUseCase: RevokeApiKeyUseCase;

  const userDid = 'did:plc:testuser';

  beforeEach(() => {
    repository = InMemoryApiKeyRepository.getInstance();
    service = new HashedApiKeyService(repository);
    createUseCase = new CreateApiKeyUseCase(repository, service);
    revokeUseCase = new RevokeApiKeyUseCase(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('CreateApiKeyUseCase', () => {
    it('should generate an API key and return the plaintext token once', async () => {
      const result = await createUseCase.execute({
        userDid,
        name: 'My Key',
      });

      expect(result.isOk()).toBe(true);
      const key = result.unwrap();
      expect(key.id).toBeDefined();
      expect(key.name).toBe('My Key');
      expect(key.token.startsWith('sk_')).toBe(true);
      expect(key.prefix.startsWith('sk_')).toBe(true);
      expect(key.token.startsWith(key.prefix)).toBe(true);

      // The stored record holds only the hash, never the plaintext token.
      const stored = await repository.findByIdForUser(key.id, userDid);
      expect(stored.unwrap()).not.toBeNull();
      expect(stored.unwrap()!.tokenHash).toBe(service.hashToken(key.token));
      expect(JSON.stringify(stored.unwrap())).not.toContain(key.token);
    });
  });

  describe('Validating an API key', () => {
    it('should verify a freshly generated token to its owner', async () => {
      const created = (
        await createUseCase.execute({ userDid, name: 'Valid Key' })
      ).unwrap();

      const verifyResult = await service.verify(created.token);

      expect(verifyResult.isOk()).toBe(true);
      const record = verifyResult.unwrap();
      expect(record).not.toBeNull();
      expect(record!.id).toBe(created.id);
      expect(record!.userDid).toBe(userDid);
    });

    it('should not verify an unknown or malformed token', async () => {
      const unknown = await service.verify('sk_doesnotexist');
      expect(unknown.unwrap()).toBeNull();

      const malformed = await service.verify('not-an-api-key');
      expect(malformed.unwrap()).toBeNull();
    });
  });

  describe('RevokeApiKeyUseCase', () => {
    it('should revoke an existing API key', async () => {
      const created = (
        await createUseCase.execute({ userDid, name: 'To Revoke' })
      ).unwrap();

      const revokeResult = await revokeUseCase.execute({
        userDid,
        id: created.id,
      });

      expect(revokeResult.isOk()).toBe(true);
      expect(revokeResult.unwrap()).toEqual({ success: true });
    });

    it('should fail to revoke a key that does not exist', async () => {
      const result = await revokeUseCase.execute({
        userDid,
        id: 'non-existent-id',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApiKeyErrors.ApiKeyNotFoundError);
      }
    });

    it("should fail to revoke another user's key", async () => {
      const created = (
        await createUseCase.execute({ userDid, name: 'Owned Key' })
      ).unwrap();

      const result = await revokeUseCase.execute({
        userDid: 'did:plc:otheruser',
        id: created.id,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApiKeyErrors.ApiKeyNotFoundError);
      }
    });
  });

  describe('Calling with a revoked API key', () => {
    it('should refuse to verify a token after its key is revoked', async () => {
      const created = (
        await createUseCase.execute({ userDid, name: 'Soon Revoked' })
      ).unwrap();

      // The token validates while active.
      expect((await service.verify(created.token)).unwrap()).not.toBeNull();

      const revokeResult = await revokeUseCase.execute({
        userDid,
        id: created.id,
      });
      expect(revokeResult.isOk()).toBe(true);

      // After revocation, the same token no longer resolves to a user.
      const verifyAfterRevoke = await service.verify(created.token);
      expect(verifyAfterRevoke.isOk()).toBe(true);
      expect(verifyAfterRevoke.unwrap()).toBeNull();
    });
  });
});
