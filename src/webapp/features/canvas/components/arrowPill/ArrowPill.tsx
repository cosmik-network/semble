import type { ConnectionType } from '@semble/types';
import { useLayoutEffect, useRef } from 'react';
import { useEditor, type TLShapeId, type VecLike } from 'tldraw';
import { pillSize } from '../../shapes/connectionArrow/connectionArrows';
import ConnectionTypePill from '../connectionTypePill/ConnectionTypePill';
import classes from './ArrowPill.module.css';

interface Props {
  arrowId: TLShapeId;
  type: ConnectionType;
  own: boolean;
  // Where it sits, in the arrow's space
  middle: VecLike;
}

// Reports its size so the arrow's selection outline can leave a gap for it
export default function ArrowPill(props: Props) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const size = pillSize(editor, props.arrowId);
    size.set({ w: ref.current!.offsetWidth, h: ref.current!.offsetHeight });
    return () => {
      size.set(null);
    };
  }, [editor, props.arrowId, props.type, props.own]);

  return (
    <div
      ref={ref}
      className={classes.pill}
      style={{
        transform: `translate(${props.middle.x}px, ${props.middle.y}px) translate(-50%, -50%)`,
      }}
    >
      <ConnectionTypePill type={props.type} own={props.own} />
    </div>
  );
}
