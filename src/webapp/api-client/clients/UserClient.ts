import { BaseClient } from './BaseClient';
import {
  LoginWithAppPasswordRequest,
  InitiateOAuthSignInRequest,
  CompleteOAuthSignInRequest,
  RefreshAccessTokenRequest,
  GenerateExtensionTokensRequest,
  LoginWithAppPasswordResponse,
  InitiateOAuthSignInResponse,
  CompleteOAuthSignInResponse,
  RefreshAccessTokenResponse,
  GenerateExtensionTokensResponse,
  FollowTargetRequest,
  FollowTargetResponse,
  ListApiKeysResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  UpdateApiKeyResponse,
  RevokeApiKeyRequest,
  RevokeApiKeyResponse,
} from '@semble/types';

export class UserClient extends BaseClient {
  async loginWithAppPassword(
    request: LoginWithAppPasswordRequest,
  ): Promise<LoginWithAppPasswordResponse> {
    const res = await this.client.users.loginWithAppPassword({ body: request });
    return res.body as LoginWithAppPasswordResponse;
  }

  async initiateOAuthSignIn(
    request?: InitiateOAuthSignInRequest,
  ): Promise<InitiateOAuthSignInResponse> {
    const res = await this.client.users.initiateOAuth({
      query: { handle: request?.handle },
    });
    return res.body as InitiateOAuthSignInResponse;
  }

  async completeOAuthSignIn(
    request: CompleteOAuthSignInRequest,
  ): Promise<CompleteOAuthSignInResponse> {
    const res = await this.client.users.oauthCallback({
      query: { code: request.code, state: request.state, iss: request.iss },
    });
    return res.body as CompleteOAuthSignInResponse;
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    const res = await this.client.users.refreshToken({ body: request });
    return res.body as RefreshAccessTokenResponse;
  }

  async generateExtensionTokens(
    _request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    const res = await this.client.users.extensionTokens({ query: {} });
    return res.body as GenerateExtensionTokensResponse;
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    const res = await this.client.users.logout({ body: {} });
    return res.body as { success: boolean; message: string };
  }

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    const res = await this.client.users.followTarget({ body: request });
    return res.body as FollowTargetResponse;
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    await this.client.users.unfollowTarget({ body: { targetId, targetType } });
  }

  async listApiKeys(): Promise<ListApiKeysResponse> {
    const res = await this.client.users.listApiKeys({ query: {} });
    return res.body as ListApiKeysResponse;
  }

  async createApiKey(
    request: CreateApiKeyRequest,
  ): Promise<CreateApiKeyResponse> {
    const res = await this.client.users.createApiKey({ body: request });
    return res.body as CreateApiKeyResponse;
  }

  async updateApiKey(
    request: UpdateApiKeyRequest,
  ): Promise<UpdateApiKeyResponse> {
    const res = await this.client.users.updateApiKey({ body: request });
    return res.body as UpdateApiKeyResponse;
  }

  async revokeApiKey(
    request: RevokeApiKeyRequest,
  ): Promise<RevokeApiKeyResponse> {
    const res = await this.client.users.revokeApiKey({ body: request });
    return res.body as RevokeApiKeyResponse;
  }
}
