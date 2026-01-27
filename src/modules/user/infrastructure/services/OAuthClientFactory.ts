import {
  NodeOAuthClient,
  OAuthClientMetadataInput,
  NodeSavedStateStore,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';
import { InMemoryStateStore } from '../../tests/infrastructure/InMemoryStateStore';
import { InMemorySessionStore } from '../../tests/infrastructure/InMemorySessionStore';
import { configService } from 'src/shared/infrastructure/config';
import { LockServiceFactory } from 'src/shared/infrastructure/locking';

export class OAuthClientFactory {
  static getClientMetadata(
    baseUrl: string,
    appName: string = 'Semble',
  ): { clientMetadata: OAuthClientMetadataInput } {
    const url = baseUrl || 'http://127.0.0.1:3000';
    const enc = encodeURIComponent;
    const isLocal = configService.get().environment === 'local';

    return {
      clientMetadata: {
        client_name: appName,
        client_id: !isLocal
          ? `${url}/atproto/client-metadata.json`
          : `http://localhost?redirect_uri=${enc(`${baseUrl}/api/users/oauth/callback`)}&scope=${enc('atproto transition:generic')}`,
        client_uri: url,
        redirect_uris: [`${baseUrl}/api/users/oauth/callback`],
        scope: 'atproto offline_access blob:* include:network.cosmik.authFull',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        application_type: 'web',
        token_endpoint_auth_method: 'none',
        dpop_bound_access_tokens: true,
      },
    };
  }

  static createClient(
    stateStore: NodeSavedStateStore,
    sessionStore: NodeSavedSessionStore,
    baseUrl: string,
    appName: string = 'Semble',
  ): NodeOAuthClient {
    const { clientMetadata } = this.getClientMetadata(baseUrl, appName);
    const lockService = LockServiceFactory.create();

    return new NodeOAuthClient({
      clientMetadata,
      stateStore,
      sessionStore,
      requestLock: lockService.createRequestLock(),
    });
  }

  static createInMemoryClient(
    baseUrl: string,
    appName: string = 'Semble',
  ): NodeOAuthClient {
    const { clientMetadata } = this.getClientMetadata(baseUrl, appName);
    const stateStore = InMemoryStateStore.getInstance();
    const sessionStore = InMemorySessionStore.getInstance();
    const lockService = LockServiceFactory.create();

    return new NodeOAuthClient({
      clientMetadata,
      stateStore,
      sessionStore,
      requestLock: lockService.createRequestLock(),
    });
  }
}
