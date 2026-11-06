import type { ConnectionType } from '@semble/types';
import { useLayoutEffect, useRef } from 'react';
import { useEditor, type TLShapeId, type VecLike } from 'tldraw';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import type { ConnectionNote } from '../../server/canvasServer';
import { pillSize } from '../../shapes/connectionArrow/connectionArrows';
import ConnectionTypePill from '../connectionTypePill/ConnectionTypePill';
import classes from './ArrowPill.module.css';

interface Props {
  arrowId: TLShapeId;
  type: ConnectionType;
  own: boolean;
  note: ConnectionNote | null;
  showNote: boolean;
  // Where it sits, in the arrow's space
  middle: VecLike;
}

// Reports its size so the arrow's selection outline can leave a gap for it.
// The note hangs below it, outside that size.
export default function ArrowPill(props: Props) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const size = pillSize(editor, props.arrowId);
    const measured = {
      w: ref.current!.offsetWidth,
      h: ref.current!.offsetHeight,
    };
    size.set(measured);
    // On select, the overlay's pill may mount before the arrow's unmounts
    return () => {
      if (size.get() === measured) size.set(null);
    };
  }, [editor, props.arrowId, props.type, props.own, props.note]);

  return (
    <div
      ref={ref}
      className={classes.pill}
      style={{
        transform: `translate(${props.middle.x}px, ${props.middle.y}px) translate(-50%, -50%)`,
      }}
    >
      <ConnectionTypePill
        type={props.type}
        own={props.own}
        hasNote={!!props.note}
      />
      {props.showNote && props.note && (
        <div className={classes.note}>
          <NoteCardInline
            note={{ id: props.arrowId, text: props.note.text }}
            cardAuthor={props.note.author}
            lineClamp={6}
          />
        </div>
      )}
    </div>
  );
}
