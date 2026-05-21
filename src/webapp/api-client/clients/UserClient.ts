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
  routes,
} from '@semble/types';

export class UserClient extends BaseClient {
  async loginWithAppPassword(
    request: LoginWithAppPasswordRequest,
  ): Promise<LoginWithAppPasswordResponse> {
    return this.request<LoginWithAppPasswordResponse>(
      routes.users.loginWithAppPassword,
      { body: request },
    );
  }

  async initiateOAuthSignIn(
    request?: InitiateOAuthSignInRequest,
  ): Promise<InitiateOAuthSignInResponse> {
    return this.request<InitiateOAuthSignInResponse>(
      routes.users.initiateOAuth,
      {
        query: { handle: request?.handle },
      },
    );
  }

  async completeOAuthSignIn(
    request: CompleteOAuthSignInRequest,
  ): Promise<CompleteOAuthSignInResponse> {
    return this.request<CompleteOAuthSignInResponse>(
      routes.users.oauthCallback,
      {
        query: { code: request.code, state: request.state, iss: request.iss },
      },
    );
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    return this.request<RefreshAccessTokenResponse>(routes.users.refreshToken, {
      body: request,
    });
  }

  async generateExtensionTokens(
    _request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    return this.request<GenerateExtensionTokensResponse>(
      routes.users.extensionTokens,
    );
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      routes.users.logout,
    );
  }

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    return this.request<FollowTargetResponse>(routes.users.followTarget, {
      body: request,
    });
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    return this.request<void>(routes.users.unfollowTarget, {
      query: { targetId, targetType },
    });
  }
}
