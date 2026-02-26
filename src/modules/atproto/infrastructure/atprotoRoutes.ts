import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { Router } from 'express';

export const createAtprotoRoutes = (
  router: Router,
  nodeOauthClient: NodeOAuthClient,
) => {
  router.get('/client-metadata.json', (req, res) => {
    res.json(nodeOauthClient.clientMetadata);
  });
  router.get('/oauth-client-metadata.json', (req, res) => {
    res.json(nodeOauthClient.clientMetadata);
  });

  return router;
};
