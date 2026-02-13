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
} from '@semble/types';

export class UserClient extends BaseClient {
  async loginWithAppPassword(
    request: LoginWithAppPasswordRequest,
  ): Promise<LoginWithAppPasswordResponse> {
    return this.request<LoginWithAppPasswordResponse>(
      'POST',
      '/api/users/login/app-password',
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
    const endpoint = queryString
      ? `/api/users/login?${queryString}`
      : '/api/users/login';
    return this.request<InitiateOAuthSignInResponse>('GET', endpoint);
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
      `/api/users/oauth/callback?${params}`,
    );
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    return this.request<RefreshAccessTokenResponse>(
      'POST',
      '/api/users/oauth/refresh',
      request,
    );
  }

  async generateExtensionTokens(
    request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    return this.request<GenerateExtensionTokensResponse>(
      'GET',
      '/api/users/extension/tokens',
    );
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    // With cookie-based auth, refreshToken is sent automatically via cookies
    return this.request<{ success: boolean; message: string }>(
      'POST',
      '/api/users/logout',
    );
  }

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    return this.request<FollowTargetResponse>(
      'POST',
      '/api/users/follows',
      request,
    );
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/api/users/follows/${targetId}/${targetType}`,
    );
  }
}
