import { UseCase } from 'src/shared/core/UseCase';
import { Result, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { ITokenService } from '../services/ITokenService';

export interface LogoutDTO {
  refreshToken?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export type LogoutUseCaseResponse = Result<
  LogoutResponse,
  AppError.UnexpectedError
>;

export class LogoutUseCase implements UseCase<
  LogoutDTO,
  Promise<LogoutUseCaseResponse>
> {
  constructor(private tokenService: ITokenService) {}

  async execute(request: LogoutDTO): Promise<LogoutUseCaseResponse> {
    const errors: string[] = [];

    try {
      // Revoke refresh token if provided
      if (request.refreshToken) {
        const revokeRefreshResult = await this.tokenService.revokeToken(
          request.refreshToken,
        );
        if (revokeRefreshResult.isErr()) {
          console.warn(
            'Failed to revoke refresh token during logout:',
            revokeRefreshResult.error,
          );
          errors.push('Failed to revoke refresh token');
        }
      }

      return ok({
        success: true,
        message:
          errors.length > 0
            ? `Logged out with warnings: ${errors.join(', ')}`
            : 'Logged out successfully',
      });
    } catch (error: any) {
      console.warn('Logout use case error:', error);
      return ok({
        success: true,
        message: 'Logged out (with warnings)',
      });
    }
  }
}
