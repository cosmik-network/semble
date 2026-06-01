import { initContract, type AppRouter } from '@ts-rest/core';
import { cardsContract } from './contract/cards';
import { collectionsContract } from './contract/collections';
import { usersContract } from './contract/users';
import { feedsContract } from './contract/feeds';
import { notificationsContract } from './contract/notifications';
import { connectionsContract } from './contract/connections';
import { searchContract } from './contract/search';
import { graphContract } from './contract/graph';
import { filterPublicRoutes } from './filter';

const c = initContract();

export type ContractType = {
  cards: typeof cardsContract;
  collections: typeof collectionsContract;
  users: typeof usersContract;
  feeds: typeof feedsContract;
  notifications: typeof notificationsContract;
  connections: typeof connectionsContract;
  search: typeof searchContract;
  graph: typeof graphContract;
};

export const contract: ContractType = c.router({
  cards: cardsContract,
  collections: collectionsContract,
  users: usersContract,
  feeds: feedsContract,
  notifications: notificationsContract,
  connections: connectionsContract,
  search: searchContract,
  graph: graphContract,
} satisfies AppRouter);

export const publicContract: AppRouter = filterPublicRoutes(contract);

export { filterPublicRoutes } from './filter';

export { paths } from '@semble/types';

export {
  cardsContract,
  collectionsContract,
  usersContract,
  feedsContract,
  notificationsContract,
  connectionsContract,
  searchContract,
  graphContract,
};
