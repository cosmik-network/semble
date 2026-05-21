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
      'POST',
      routes.users.loginWithAppPassword.path,
      request,
    );
  }

  async initiateOAuthSignIn(
    request?: InitiateOAuthSignInRequest,
  ): Promise<InitiateOAuthSignInResponse> {
    const params = new URLSearchParams();
    if (request?.handle) {
      params.set('handle', request.handle);
    }
    const queryString = params.toString();
    const base = routes.users.initiateOAuth.path;
    return this.request<InitiateOAuthSignInResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async completeOAuthSignIn(
    request: CompleteOAuthSignInRequest,
  ): Promise<CompleteOAuthSignInResponse> {
    const params = new URLSearchParams({
      code: request.code,
      state: request.state,
      iss: request.iss,
    });
    return this.request<CompleteOAuthSignInResponse>(
      'GET',
      `${routes.users.oauthCallback.path}?${params}`,
    );
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    return this.request<RefreshAccessTokenResponse>(
      'POST',
      routes.users.refreshToken.path,
      request,
    );
  }

  async generateExtensionTokens(
    _request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    return this.request<GenerateExtensionTokensResponse>(
      'GET',
      routes.users.extensionTokens.path,
    );
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      'POST',
      routes.users.logout.path,
    );
  }

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    return this.request<FollowTargetResponse>(
      'POST',
      routes.users.followTarget.path,
      request,
    );
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    return this.request<void>(
      'DELETE',
      routes.users.unfollowTarget.build({ targetId, targetType }),
    );
  }
}
