import { initClient, initContract } from '@ts-rest/core';
import {
  cardsContract,
  collectionsContract,
  usersContract,
  feedsContract,
  notificationsContract,
  connectionsContract,
  searchContract,
  graphContract,
} from '@semble/contract';

const c = initContract();

const contract = c.router({
  cards: cardsContract,
  collections: collectionsContract,
  users: usersContract,
  feeds: feedsContract,
  notifications: notificationsContract,
  connections: connectionsContract,
  search: searchContract,
  graph: graphContract,
});

export function createTsRestClient(baseUrl: string, accessToken?: string) {
  return initClient(contract, {
    baseUrl,
    credentials: accessToken ? 'omit' : 'include',
    baseHeaders: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
    throwOnUnknownStatus: true,
  });
}

export type TsRestClient = ReturnType<typeof createTsRestClient>;
