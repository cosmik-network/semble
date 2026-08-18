import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { createApiUsageLogger } from '../middleware/ApiUsageLogger';
import {
  ApiRequestLogEntry,
  IApiRequestLogRepository,
} from '../../../../modules/analytics/domain/IApiRequestLogRepository';
import { ITokenService } from '../../../../modules/user/application/services/ITokenService';
import { IApiKeyService } from '../../../../modules/user/application/services/IApiKeyService';
import {
  ApiKeyRecord,
  IApiKeyRepository,
} from '../../../../modules/user/domain/repositories/IApiKeyRepository';
import { CookieService } from '../services/CookieService';
import { ok, Result } from '../../../core/Result';

const VALID_JWT = 'valid-jwt-token';
const VALID_API_KEY = 'sk_valid_key';
const JWT_DID = 'did:plc:jwtuser';
const API_KEY_DID = 'did:plc:apikeyuser';

const apiKeyRecord: ApiKeyRecord = {
  id: 'key-1',
  userDid: API_KEY_DID,
  name: 'test key',
  prefix: 'sk_valid_ke',
  tokenHash: 'hash',
  createdAt: new Date(),
  lastUsedAt: null,
  expiresAt: null,
  revoked: false,
};

class RecordingApiRequestLogRepository implements IApiRequestLogRepository {
  public entries: ApiRequestLogEntry[] = [];

  async log(entry: ApiRequestLogEntry): Promise<Result<void>> {
    this.entries.push(entry);
    return ok(undefined);
  }
}

/** Let the fire-and-forget write scheduled on res 'finish' settle. */
const flush = () => new Promise(setImmediate);

describe('ApiUsageLogger', () => {
  let logRepository: RecordingApiRequestLogRepository;
  let app: express.Express;

  beforeEach(() => {
    logRepository = new RecordingApiRequestLogRepository();

    const tokenService: ITokenService = {
      generateToken: jest.fn(),
      validateToken: async (token: string) =>
        ok(token === VALID_JWT ? JWT_DID : null),
      refreshToken: jest.fn(),
      revokeToken: jest.fn(),
    };
    const apiKeyService: IApiKeyService = {
      generate: jest.fn(),
      hashToken: jest.fn(),
      verify: async (token: string) =>
        ok(token === VALID_API_KEY ? apiKeyRecord : null),
    };
    const apiKeyRepository = {
      touchLastUsed: async () => ok(undefined),
    } as unknown as IApiKeyRepository;
    const cookieService = {
      getAccessToken: (req: express.Request) =>
        (req as express.Request & { cookies: Record<string, string> }).cookies
          ?.access_token,
    } as unknown as CookieService;

    const authMiddleware = new AuthMiddleware(
      tokenService,
      cookieService,
      apiKeyService,
      apiKeyRepository,
    );

    app = express();
    app.use(cookieParser());
    const router = express.Router();
    router.use(createApiUsageLogger(logRepository));
    router.get(
      '/test/:id',
      authMiddleware.ensureAuthenticated(),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );
    app.use('/xrpc', router);
  });

  it('logs API-key requests with inferred source "api" and the route pattern', async () => {
    await request(app)
      .get('/xrpc/test/123')
      .set('x-api-key', VALID_API_KEY)
      .expect(200);
    await flush();

    expect(logRepository.entries).toEqual([
      {
        userDid: API_KEY_DID,
        method: 'GET',
        endpoint: '/xrpc/test/:id',
        source: 'api',
        authMethod: 'apiKey',
        status: 200,
      },
    ]);
  });

  it('uses the X-Semble-Client header as source when present', async () => {
    await request(app)
      .get('/xrpc/test/123')
      .set('Authorization', `Bearer ${VALID_API_KEY}`)
      .set('X-Semble-Client', 'mcp')
      .expect(200);
    await flush();

    expect(logRepository.entries).toHaveLength(1);
    expect(logRepository.entries[0]).toMatchObject({
      source: 'mcp',
      authMethod: 'apiKey',
      userDid: API_KEY_DID,
    });
  });

  it('infers source "extension" for bearer-JWT requests', async () => {
    await request(app)
      .get('/xrpc/test/123')
      .set('Authorization', `Bearer ${VALID_JWT}`)
      .expect(200);
    await flush();

    expect(logRepository.entries).toHaveLength(1);
    expect(logRepository.entries[0]).toMatchObject({
      source: 'extension',
      authMethod: 'bearer-jwt',
      userDid: JWT_DID,
    });
  });

  it('ignores a malformed X-Semble-Client header and falls back to inference', async () => {
    await request(app)
      .get('/xrpc/test/123')
      .set('x-api-key', VALID_API_KEY)
      .set('X-Semble-Client', 'not valid!! <script>')
      .expect(200);
    await flush();

    expect(logRepository.entries).toHaveLength(1);
    expect(logRepository.entries[0]!.source).toBe('api');
  });

  it('does not log cookie-authenticated (webapp) requests', async () => {
    await request(app)
      .get('/xrpc/test/123')
      .set('Cookie', [`access_token=${VALID_JWT}`])
      .expect(200);
    await flush();

    expect(logRepository.entries).toEqual([]);
  });

  it('does not log unauthenticated requests', async () => {
    await request(app).get('/xrpc/test/123').expect(401);
    await flush();

    expect(logRepository.entries).toEqual([]);
  });

  it('does not fail the request when the log write rejects', async () => {
    logRepository.log = () => Promise.reject(new Error('db down'));

    await request(app)
      .get('/xrpc/test/123')
      .set('x-api-key', VALID_API_KEY)
      .expect(200);
    await flush();
  });
});
