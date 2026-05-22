import { TsRestClient } from '../tsRestClient';

export abstract class BaseClient {
  constructor(protected client: TsRestClient) {}
}
