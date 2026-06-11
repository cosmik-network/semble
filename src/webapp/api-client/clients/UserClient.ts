import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
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
  SubscribeToTargetRequest,
  SubscribeToTargetResponse,
  UpdateSubscriptionRequest,
  UpdateSubscriptionResponse,
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
    return unwrap<LoginWithAppPasswordResponse>(res);
  }

  async initiateOAuthSignIn(
    request?: InitiateOAuthSignInRequest,
  ): Promise<InitiateOAuthSignInResponse> {
    const res = await this.client.users.initiateOAuth({
      query: { handle: request?.handle },
    });
    return unwrap<InitiateOAuthSignInResponse>(res);
  }

  async completeOAuthSignIn(
    request: CompleteOAuthSignInRequest,
  ): Promise<CompleteOAuthSignInResponse> {
    const res = await this.client.users.oauthCallback({
      query: { code: request.code, state: request.state, iss: request.iss },
    });
    return unwrap<CompleteOAuthSignInResponse>(res);
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    const res = await this.client.users.refreshToken({ body: request });
    return unwrap<RefreshAccessTokenResponse>(res);
  }

  async generateExtensionTokens(
    _request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    const res = await this.client.users.extensionTokens({ query: {} });
    return unwrap<GenerateExtensionTokensResponse>(res);
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    const res = await this.client.users.logout({ body: {} });
    return unwrap<{ success: boolean; message: string }>(res);
  }

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    const res = await this.client.graph.followTarget({ body: request });
    return unwrap<FollowTargetResponse>(res);
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    const res = await this.client.graph.unfollowTarget({
      body: { targetId, targetType },
    });
    unwrap<unknown>(res);
  }

  async subscribeToTarget(
    request: SubscribeToTargetRequest,
  ): Promise<SubscribeToTargetResponse> {
    const res = await this.client.graph.subscribeToTarget({ body: request });
    return unwrap<SubscribeToTargetResponse>(res);
  }

  async unsubscribeFromTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    const res = await this.client.graph.unsubscribeFromTarget({
      body: { targetId, targetType },
    });
    unwrap<unknown>(res);
  }

  async updateSubscription(
    request: UpdateSubscriptionRequest,
  ): Promise<UpdateSubscriptionResponse> {
    const res = await this.client.graph.updateSubscription({ body: request });
    return unwrap<UpdateSubscriptionResponse>(res);
  }

  async listApiKeys(): Promise<ListApiKeysResponse> {
    const res = await this.client.users.listApiKeys({ query: {} });
    return unwrap<ListApiKeysResponse>(res);
  }

  async createApiKey(
    request: CreateApiKeyRequest,
  ): Promise<CreateApiKeyResponse> {
    const res = await this.client.users.createApiKey({ body: request });
    return unwrap<CreateApiKeyResponse>(res);
  }

  async updateApiKey(
    request: UpdateApiKeyRequest,
  ): Promise<UpdateApiKeyResponse> {
    const res = await this.client.users.updateApiKey({ body: request });
    return unwrap<UpdateApiKeyResponse>(res);
  }

  async revokeApiKey(
    request: RevokeApiKeyRequest,
  ): Promise<RevokeApiKeyResponse> {
    const res = await this.client.users.revokeApiKey({ body: request });
    return unwrap<RevokeApiKeyResponse>(res);
  }
}
