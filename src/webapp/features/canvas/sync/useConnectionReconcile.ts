import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Editor, useValue } from 'tldraw';
import { ConnectionType, ConnectionWithSourceAndTarget } from '@semble/types';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import { getConnectionsForUrl } from '@/features/connections/lib/dal';
import { connectionKeys } from '@/features/connections/lib/connectionKeys';
import { RECONCILE_CAP } from '../const';
import {
  getArrowEnds,
  getArrowMeta,
  serverWrite,
  upsertConnectionArrows,
} from '../lib/arrows';
import { getNodeUrl, isNodeShape, nodeKey } from '../lib/nodes';
import type { CanvasSession } from '../lib/canvasSession';
import type { CanvasConnection } from '../types';

const toCanvasConnection = (
  c: ConnectionWithSourceAndTarget,
): CanvasConnection => ({
  id: c.connection.id,
  sourceUrl: c.source.url,
  targetUrl: c.target.url,
  type: CONNECTION_TYPES.some((t) => t.value === c.connection.type)
    ? (c.connection.type as ConnectionType)
    : 'RELATED',
  note: c.connection.note,
  curatorId: c.connection.curator.id,
});

export function useConnectionReconcile(editor: Editor, session: CanvasSession) {
  const urlsKey = useValue(
    'canvas node urls',
    () =>
      Array.from(
        new Set(
          editor.getCurrentPageShapes().flatMap((s) => {
            if (!isNodeShape(s) || ('ghost' in s.props && s.props.ghost)) {
              return [];
            }
            const url = getNodeUrl(s);
            return url ? [url] : [];
          }),
        ),
      )
        .sort()
        .join('\n'),
    [editor],
  );
  // Copies added, removed or moved between containers change which pairs get arrows
  const nodesKey = useValue(
    'canvas node placement',
    () =>
      editor
        .getCurrentPageShapes()
        .filter(isNodeShape)
        .map((s) => `${s.id}@${s.parentId}`)
        .sort()
        .join(','),
    [editor],
  );
  const urls = useMemo(
    () => (urlsKey ? urlsKey.split('\n').slice(0, RECONCILE_CAP) : []),
    [urlsKey],
  );

  // Keyed under forwardForUrl so existing mutation invalidations refresh these
  const results = useQueries({
    queries: urls.map((url) => ({
      queryKey: [...connectionKeys.forwardForUrl(url), 'canvas'],
      queryFn: () =>
        getConnectionsForUrl({ url, direction: 'forward', limit: 100 }),
      staleTime: 60_000,
    })),
  });

  const loadedUrls = urls.filter((_, i) => results[i]?.isSuccess);
  const signature = results.map((r) => r.dataUpdatedAt).join(',');

  useEffect(() => {
    session.setServer(
      results.flatMap((r) => r.data?.connections.map(toCanvasConnection) ?? []),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, session]);

  const version = useValue(session.version);
  const pendingDeletes = useValue(session.pendingDeletes);
  const loadedKey = loadedUrls.join('\n');

  useEffect(() => {
    const onCanvas = new Set(urlsKey.split('\n').map(nodeKey));
    const loaded = new Set(loadedKey.split('\n').map(nodeKey));
    const awaitingConfirm = new Set(pendingDeletes.map((c) => c.id));
    const desired = session
      .all()
      .filter(
        (c) =>
          onCanvas.has(nodeKey(c.sourceUrl)) &&
          onCanvas.has(nodeKey(c.targetUrl)) &&
          !awaitingConfirm.has(c.id),
      );
    const desiredIds = new Set(desired.map((c) => c.id));

    serverWrite(editor, () => {
      const drawn = new Set(
        desired.flatMap((c) =>
          upsertConnectionArrows(
            editor,
            c,
            c.curatorId === session.userId ? 'saved' : 'ghost',
          ),
        ),
      );

      // Arrows for pairs of copies that no longer exist go right away; arrows for
      // connections we no longer see only once their source's data is fresh
      const stale = editor.getCurrentPageShapes().filter((shape) => {
        if (shape.type !== 'arrow' || drawn.has(shape.id)) return false;
        const meta = getArrowMeta(shape);
        if (meta.status !== 'saved' && meta.status !== 'ghost') return false;
        if (!meta.connectionId || awaitingConfirm.has(meta.connectionId)) {
          return false;
        }
        if (desiredIds.has(meta.connectionId)) return true;
        const source = getArrowEnds(editor, shape.id)?.source;
        const sourceUrl = source && getNodeUrl(source);
        return !sourceUrl || loaded.has(nodeKey(sourceUrl));
      });
      if (stale.length) editor.deleteShapes(stale.map((s) => s.id));
    });
  }, [editor, session, version, urlsKey, nodesKey, loadedKey, pendingDeletes]);
}
