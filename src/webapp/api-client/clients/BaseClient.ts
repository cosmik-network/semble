import { ApiError, ApiErrorResponse } from '../errors';

export abstract class BaseClient {
  constructor(
    protected baseUrl: string,
    private accessToken?: string, // Add optional access token for server-side requests
  ) {}

  protected async request<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include access token as cookie header if provided (for server-side requests)
    if (this.accessToken) {
      headers.Cookie = `accessToken=${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: this.accessToken ? 'omit' : 'include', // Use 'omit' for server-side with manual cookies
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiErrorResponse;

      try {
        errorData = await response.json();
      } catch {
        errorData = {
          message: response.statusText || 'Unknown error',
        };
      }

      throw new ApiError(
        errorData.message,
        response.status,
        errorData.code,
        errorData.details,
      );
    }

    return response.json();
  }
}
