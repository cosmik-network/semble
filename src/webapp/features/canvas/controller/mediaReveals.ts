import { atom, type TLShapeId } from 'tldraw';

// Cards whose labelled media the viewer chose to show. Each copy on its own,
// and only until the board closes, as in the webapp.
export function createMediaReveals() {
  const revealed = atom('revealed media', new Set<TLShapeId>());
  return {
    isRevealed: (id: TLShapeId) => revealed.get().has(id),
    toggle(id: TLShapeId) {
      revealed.update((ids) => {
        const next = new Set(ids);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    },
  };
}

export type MediaReveals = ReturnType<typeof createMediaReveals>;
