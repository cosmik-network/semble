import { Result } from 'src/shared/core/Result';
import { DID } from '../domain/DID';
import { Agent } from '@atproto/api';

export interface IAgentService {
  getUnauthenticatedAgent(): Result<Agent, Error>;
  getAuthenticatedAgent(did: DID): Promise<Result<Agent, Error>>;
  getAuthenticatedServiceAccountAgent(): Promise<Result<Agent, Error>>;
}
