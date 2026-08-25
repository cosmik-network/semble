import { Response } from 'express';
import { ok, err } from 'src/shared/core/Result';
import { GetMyProfileController } from '../../infrastructure/http/controllers/GetMyProfileController';
import { GetProfileUseCase } from '../../application/useCases/queries/GetProfileUseCase';
import { AuthenticatedRequest } from 'src/shared/infrastructure/http/middleware/AuthMiddleware';

function makeRes() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

function makeReq(did?: string): AuthenticatedRequest {
  return { did, query: {} } as unknown as AuthenticatedRequest;
}

const profile = {
  id: 'did:plc:someuser',
  name: 'Alice',
  handle: 'alice.bsky.social',
};

describe('GetMyProfileController', () => {
  it('returns the profile with atprotoSessionValid=true when everything works', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(ok(profile)),
    } as unknown as GetProfileUseCase;
    const controller = new GetMyProfileController(useCase, async () => true);
    const res = makeRes();

    await controller.execute(makeReq('did:plc:someuser'), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...profile,
      atprotoSessionValid: true,
    });
  });

  it('returns 200 with atprotoSessionValid=false when the profile fetch fails on a dead session', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(err(new Error('agent unavailable'))),
    } as unknown as GetProfileUseCase;
    const controller = new GetMyProfileController(useCase, async () => false);
    const res = makeRes();

    await controller.execute(makeReq('did:plc:someuser'), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'did:plc:someuser',
        atprotoSessionValid: false,
      }),
    );
  });

  it('still fails with 500 when the profile fetch fails but the session is valid', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(err(new Error('boom'))),
    } as unknown as GetProfileUseCase;
    const controller = new GetMyProfileController(useCase, async () => true);
    const res = makeRes();

    await controller.execute(makeReq('did:plc:someuser'), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
