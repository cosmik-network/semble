import type { ReactNode } from 'react';
import {
  ArrowShapeUtil,
  STROKE_SIZES,
  SVGContainer,
  getArrowInfo,
  track,
  useEditor,
  useUniqueSafeId,
  type TLArrowShape,
  type VecLike,
} from 'tldraw';
import ArrowPill from '../../components/arrowPill/ArrowPill';
import { detailLevel } from '../detailLevel';
import {
  arrowDisplay,
  arrowMiddle,
  connectionOf,
  connectionArrowPaths,
  pillSize,
  type PillSize,
} from './connectionArrows';
import classes from './ConnectionArrowShapeUtil.module.css';

const OPACITY = {
  own: { strong: 1, faint: 0.35 },
  ghost: { strong: 0.6, faint: 0.25 },
};

// Connection arrows' ends follow the server, so they have no handles or label,
// and moving one leaves its bindings be. Other arrows are tldraw's own.
export class ConnectionArrowShapeUtil extends ArrowShapeUtil {
  override getHandles(shape: TLArrowShape) {
    return connectionOf(shape) ? [] : super.getHandles(shape);
  }

  override canEdit(shape?: TLArrowShape) {
    return !shape || !connectionOf(shape);
  }

  override onTranslateStart(shape: TLArrowShape) {
    if (connectionOf(shape)) return;
    return super.onTranslateStart(shape);
  }

  override onTranslate(initialShape: TLArrowShape, shape: TLArrowShape) {
    if (connectionOf(shape)) return;
    return super.onTranslate(initialShape, shape);
  }

  override component(shape: TLArrowShape) {
    const connection = connectionOf(shape);
    if (!connection) return super.component(shape);
    const display = arrowDisplay(this.editor, shape);
    // The record keeps the full size
    const drawn: TLArrowShape = {
      ...shape,
      props: { ...shape.props, size: display.strong ? 'm' : 's' },
    };
    const opacity =
      OPACITY[connection.own ? 'own' : 'ghost'][
        display.strong ? 'strong' : 'faint'
      ];
    const middle =
      detailLevel(this.editor) === 'full' && arrowMiddle(this.editor, shape);

    // The pill stays crisp on a faded arrow
    return (
      <>
        <ConnectionArrowSvg arrow={drawn} opacity={opacity} />
        {display.pill && connection.connectionType && middle && (
          <ArrowPill
            arrowId={shape.id}
            type={connection.connectionType}
            own={connection.own}
            middle={middle}
          />
        )}
      </>
    );
  }

  // The selection outline is drawn above every shape, so it leaves a gap for
  // the pill
  override indicator(shape: TLArrowShape) {
    const outline = super.indicator(shape);
    const size = connectionOf(shape)
      ? pillSize(this.editor, shape.id).get()
      : null;
    const middle = size && arrowMiddle(this.editor, shape);
    if (!size || !middle) return outline;
    return (
      <OutlineWithGap middle={middle} size={size}>
        {outline}
      </OutlineWithGap>
    );
  }
}

interface ConnectionArrowSvgProps {
  arrow: TLArrowShape;
  opacity: number;
}

// Drawn here rather than by tldraw, whose arrow wraps each body in a clip path
// and would need an opacity group to fade: with thousands of arrows, the
// browser couldn't repaint them fast enough while panning. A connection arrow
// has no label or handles to need them.
// Tracked: moving a card changes its arrows' geometry, not their records
const ConnectionArrowSvg = track(function ConnectionArrowSvg(
  props: ConnectionArrowSvgProps,
) {
  const editor = useEditor();
  const info = getArrowInfo(editor, props.arrow);
  if (!info?.isValid) return null;
  const strokeWidth =
    STROKE_SIZES[props.arrow.props.size] * props.arrow.props.scale;
  const { body, head } = connectionArrowPaths(info, strokeWidth);
  const dotted = props.arrow.props.dash === 'dotted';

  // Faded per stroke, not as a group, which the browser paints separately
  return (
    <SVGContainer>
      <g
        className={classes.arrow}
        strokeWidth={strokeWidth}
        strokeOpacity={props.opacity}
      >
        <path
          d={body}
          strokeDasharray={dotted ? `0 ${strokeWidth * 2}` : undefined}
        />
        {head && <path d={head} />}
      </g>
    </SVGContainer>
  );
});

interface OutlineWithGapProps {
  middle: VecLike;
  size: PillSize;
  children: ReactNode;
}

// Far enough out to cover any arrow
const MASK_EXTENT = 1e6;

function OutlineWithGap(props: OutlineWithGapProps) {
  const maskId = useUniqueSafeId();

  return (
    <g mask={`url(#${maskId})`}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect
            x={-MASK_EXTENT}
            y={-MASK_EXTENT}
            width={MASK_EXTENT * 2}
            height={MASK_EXTENT * 2}
            fill="white"
            stroke="none"
          />
          <rect
            x={props.middle.x - props.size.w / 2}
            y={props.middle.y - props.size.h / 2}
            width={props.size.w}
            height={props.size.h}
            rx={props.size.h / 2}
            fill="black"
            stroke="none"
          />
        </mask>
      </defs>
      {props.children}
    </g>
  );
}
