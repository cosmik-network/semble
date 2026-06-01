import { isAppRoute, type AppRoute, type AppRouter } from '@ts-rest/core';

export type InternalMetadata = { internal?: boolean };

const isInternal = (route: AppRoute): boolean =>
  (route.metadata as InternalMetadata | undefined)?.internal === true;

export function filterPublicRoutes<T extends AppRouter>(router: T): AppRouter {
  const out: AppRouter = {};
  for (const [key, value] of Object.entries(router)) {
    if (isAppRoute(value)) {
      if (!isInternal(value)) out[key] = value;
    } else {
      const sub = filterPublicRoutes(value as AppRouter);
      if (Object.keys(sub).length > 0) out[key] = sub;
    }
  }
  return out;
}
