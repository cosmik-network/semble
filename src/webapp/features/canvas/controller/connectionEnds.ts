import { computed, type Editor, type TLShapeId } from 'tldraw';
import type { ConnectionEnd } from '../model/arrows';
import {
  collectionFrameOf,
  type CollectionPageUrl,
} from '../model/collectionFrames';
import { LINK_CARD_TYPE } from '../model/linkCards';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
import { collectionFramesOn } from './collectionFrames';
import type { Copies } from './copies';

export interface ConnectionEndsDeps {
  editor: Editor;
  copies: Copies;
  collectionPageUrl: CollectionPageUrl;
}

// The shapes a connection can end on, link copies and collection frames, and
// the URL each stands for: a link's own, or its collection's Semble page
export function attachConnectionEnds(deps: ConnectionEndsDeps) {
  const { editor, copies } = deps;
  const frameEnds = computed('collection frame ends', () =>
    collectionFramesOn(editor).map(
      (frame): ConnectionEnd => ({
        url: deps.collectionPageUrl(frame.meta.collection.collection),
        shapeIds: [frame.id],
      }),
    ),
  );
  const all = (): ConnectionEnd[] => [
    ...Array.from(copies.byUrl(), ([url, shapeIds]) => ({ url, shapeIds })),
    ...frameEnds.get(),
  ];
  const urlsOf = (ends: ConnectionEnd[]) =>
    Array.from(new Set(ends.map((end) => end.url)));

  return {
    all,
    urls: () => urlsOf(all()),
    urlsInView() {
      const view = editor.getViewportPageBounds();
      const isInView = (id: string) =>
        view.collides(editor.getShapePageBounds(id as TLShapeId)!);
      return urlsOf(all().filter((end) => end.shapeIds.some(isInView)));
    },
    // Null for a shape no connection can end on
    urlOf(id: TLShapeId | undefined) {
      const shape = id && editor.getShape(id);
      if (!shape) return null;
      if (editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE)) {
        return shape.props.url;
      }
      const frame = collectionFrameOf(shape);
      return frame && deps.collectionPageUrl(frame.collection);
    },
  };
}

export type ConnectionEnds = ReturnType<typeof attachConnectionEnds>;
