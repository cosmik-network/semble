import { initContract, type AppRouter } from '@ts-rest/core';
import { cardsContract } from './contract/cards';
import { collectionsContract } from './contract/collections';
import { usersContract } from './contract/users';
import { feedsContract } from './contract/feeds';
import { notificationsContract } from './contract/notifications';
import { connectionsContract } from './contract/connections';
import { searchContract } from './contract/search';
import { graphContract } from './contract/graph';

const c = initContract();

const contractDef = {
  cards: cardsContract,
  collections: collectionsContract,
  users: usersContract,
  feeds: feedsContract,
  notifications: notificationsContract,
  connections: connectionsContract,
  search: searchContract,
  graph: graphContract,
} satisfies AppRouter;

export const contract: AppRouter = c.router(contractDef);

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
