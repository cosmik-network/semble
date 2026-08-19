import { Result } from '../../../shared/core/Result';

export interface ApiRequestLogEntry {
  userDid: string;
  method: string;
  /** Route pattern (e.g. /xrpc/cards/:id), not the raw URL. */
  endpoint: string;
  /** Client source: explicit X-Semble-Client value or inferred from auth method. */
  source: string;
  authMethod: 'apiKey' | 'bearer-jwt';
  status: number;
}

export interface IApiRequestLogRepository {
  log(entry: ApiRequestLogEntry): Promise<Result<void>>;
}
