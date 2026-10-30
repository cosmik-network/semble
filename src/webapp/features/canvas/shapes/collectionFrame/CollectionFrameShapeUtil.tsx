import {
  FrameShapeUtil,
  Group2d,
  HTMLContainer,
  Rectangle2d,
  type Editor,
  type TLDragShapesOverInfo,
  type TLFrameShape,
  type TLShape,
} from 'tldraw';
import {
  FRAME_FOOTER_HEIGHT,
  collectionFrameMeta,
  isCollapsed,
} from '../../model/collectionFrames';
import CollectionFrameFace from '../../components/collectionFrameFace/CollectionFrameFace';

const FRAME_RADIUS = 16;

const collapsedFrame = (shape: TLShape) => {
  const meta = collectionFrameMeta(shape.meta);
  return !!meta && isCollapsed(meta);
};

// A collapsed collection frame hides the cards in it, which it would only
// clip to its header
export function isInCollapsedFrame(editor: Editor, shape: TLShape) {
  const parent = editor.getShape(shape.parentId);
  return parent?.type === 'frame' && collapsedFrame(parent);
}

// Keeps the shape type frame, which the editor relies on for clipping
// children and for some hit testing. A frame whose meta holds a collection
// draws as the webapp's collection card; one the user drew stays plain.
export class CollectionFrameShapeUtil extends FrameShapeUtil {
  // Optional only because tldraw's frame declares these without the shape
  override canEdit(shape?: TLFrameShape) {
    return !shape || !collectionFrameMeta(shape.meta);
  }

  // A collapsed frame would hide a card dropped or pasted on it
  override canReceiveNewChildrenOfType(shape: TLShape) {
    return super.canReceiveNewChildrenOfType(shape) && !collapsedFrame(shape);
  }

  override onDragShapesIn(
    shape: TLFrameShape,
    shapes: TLShape[],
    info: TLDragShapesOverInfo,
  ) {
    if (!collapsedFrame(shape)) super.onDragShapesIn(shape, shapes, info);
  }

  override canResize(shape?: TLFrameShape) {
    return !shape || !collapsedFrame(shape);
  }

  // The header and footer pick the frame up, as a plain frame's heading
  // does; the space between passes through to the board
  override getGeometry(shape: TLFrameShape) {
    const meta = collectionFrameMeta(shape.meta);
    if (!meta) return super.getGeometry(shape);
    const { w, h } = shape.props;
    return new Group2d({
      children: [
        new Rectangle2d({ width: w, height: h, isFilled: false }),
        new Rectangle2d({
          width: w,
          height: Math.min(meta.headerHeight, h),
          isFilled: true,
          isLabel: true,
        }),
        ...(isCollapsed(meta)
          ? []
          : [
              new Rectangle2d({
                y: h - FRAME_FOOTER_HEIGHT,
                width: w,
                height: FRAME_FOOTER_HEIGHT,
                isFilled: true,
                isLabel: true,
              }),
            ]),
      ],
    });
  }

  override component(shape: TLFrameShape) {
    const meta = collectionFrameMeta(shape.meta);
    if (!meta) return super.component(shape);
    return (
      <HTMLContainer>
        <CollectionFrameFace
          id={shape.id}
          w={shape.props.w}
          h={shape.props.h}
          meta={meta}
          radius={FRAME_RADIUS}
        />
      </HTMLContainer>
    );
  }

  override indicator(shape: TLFrameShape) {
    if (!collectionFrameMeta(shape.meta)) return super.indicator(shape);
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={FRAME_RADIUS}
        ry={FRAME_RADIUS}
      />
    );
  }
}
