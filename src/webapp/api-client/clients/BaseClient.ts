import { ApiError, ApiErrorResponse } from '../errors';
import { RouteDefinition } from '@semble/types';

type QueryParamValue = string | string[] | number | boolean | undefined;

export abstract class BaseClient {
  constructor(
    protected baseUrl: string,
    private accessToken?: string, // Add optional access token for server-side requests
  ) {}

  protected async request<T>(
    route: RouteDefinition<string>,
    options?: {
      query?: Record<string, QueryParamValue>;
      body?: unknown;
    },
  ): Promise<T> {
    const endpoint = route.url(options?.query);
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include access token as cookie header if provided (for server-side requests)
    if (this.accessToken) {
      headers.Cookie = `accessToken=${this.accessToken}`;
    }

    const config: RequestInit = {
      method: route.method,
      headers,
      credentials: this.accessToken ? 'omit' : 'include', // Use 'omit' for server-side with manual cookies
    };

    const { method } = route;
    if (options?.body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(options.body);
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
