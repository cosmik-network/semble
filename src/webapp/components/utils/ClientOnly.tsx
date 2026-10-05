'use client';

import { ReactNode, useEffect, useState } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered during SSR and the first client render (typically a skeleton). */
  fallback?: ReactNode;
}

/**
 * Defers children to the browser. Use around components whose data layer
 * cannot run during SSR — an authed suspense query going through the client
 * DAL throws NoSessionError on the server (it cannot authenticate there),
 * which errors a streaming boundary and can wedge the whole response. See
 * .agent/logs/20260917_nextjs_ssr_issue.md.
 *
 * Prefer a server-side prefetch of the query key when a dal.server function
 * exists — that keeps the content in the SSR HTML. This wrapper is for the
 * cases where one doesn't.
 */
export default function ClientOnly(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return mounted ? props.children : (props.fallback ?? null);
}
