import { initContract, type AppRouter } from '@ts-rest/core';
import { cardsContract } from './contract/cards';
import { collectionsContract } from './contract/collections';
import { usersContract } from './contract/users';
import { feedsContract } from './contract/feeds';
import { notificationsContract } from './contract/notifications';
import { connectionsContract } from './contract/connections';
import { searchContract } from './contract/search';
import { tagsContract } from './contract/tags';
import { graphContract } from './contract/graph';
import { canvasContract } from './contract/canvas';
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
  tags: typeof tagsContract;
  graph: typeof graphContract;
  canvases: typeof canvasContract;
};

export const contract: ContractType = c.router({
  cards: cardsContract,
  collections: collectionsContract,
  users: usersContract,
  feeds: feedsContract,
  notifications: notificationsContract,
  connections: connectionsContract,
  search: searchContract,
  tags: tagsContract,
  graph: graphContract,
  canvases: canvasContract,
} satisfies AppRouter);

export const publicContract = filterPublicRoutes(contract);

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
  tagsContract,
  graphContract,
  canvasContract,
};
