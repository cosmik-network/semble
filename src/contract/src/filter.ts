import { isAppRoute, type AppRoute, type AppRouter } from '@ts-rest/core';

export type InternalMetadata = { internal?: boolean };

const isInternal = (route: AppRoute): boolean =>
  (route.metadata as InternalMetadata | undefined)?.internal === true;

type IsInternalRoute<R> = R extends { metadata: { internal: true } }
  ? true
  : false;

export type PublicRoutes<T> = {
  [K in keyof T as T[K] extends AppRoute
    ? IsInternalRoute<T[K]> extends true
      ? never
      : K
    : T[K] extends AppRouter
      ? keyof PublicRoutes<T[K]> extends never
        ? never
        : K
      : never]: T[K] extends AppRoute
    ? T[K]
    : T[K] extends AppRouter
      ? PublicRoutes<T[K]>
      : never;
};

export function filterPublicRoutes<T extends AppRouter>(
  router: T,
): PublicRoutes<T> {
  const out: AppRouter = {};
  for (const [key, value] of Object.entries(router)) {
    if (isAppRoute(value)) {
      if (!isInternal(value)) out[key] = value;
    } else {
      const sub = filterPublicRoutes(value as AppRouter);
      if (Object.keys(sub).length > 0) out[key] = sub as AppRouter;
    }
  }
  return out as PublicRoutes<T>;
}
