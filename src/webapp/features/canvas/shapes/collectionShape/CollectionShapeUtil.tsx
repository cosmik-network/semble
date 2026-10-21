import {
  BaseFrameLikeShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  Group2d,
  HTMLContainer,
  Rectangle2d,
  T,
  TLGeometryOpts,
  TLShape,
  Vec,
  type RecordProps,
} from 'tldraw';
import CollectionShapeBody from '../../components/collectionShapeBody/CollectionShapeBody';
import {
  ARROW_TAIL_GAP,
  COLLECTION_HEADER_H,
  COLLECTION_TYPE,
} from '../../const';

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [COLLECTION_TYPE]: {
      w: number;
      h: number;
      collectionId: string;
      name: string;
      description: string;
      accessType: 'OPEN' | 'CLOSED';
      authorHandle: string;
      authorAvatarUrl: string;
      // Record key for linking to the collection page; may be unknown for new ones
      rkey: string;
      collapsed: boolean;
      expandedH: number;
      // Someone else's closed collection: cards can't be added or removed
      readOnly: boolean;
    };
  }
}

export type CollectionShape = TLShape<typeof COLLECTION_TYPE>;

const versions = createShapePropsMigrationIds(COLLECTION_TYPE, {
  AddCollapseAndAccess: 1,
});

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.AddCollapseAndAccess,
      up: (props) => ({
        ...props,
        rkey: '',
        collapsed: false,
        expandedH: props.h,
        readOnly: false,
      }),
      down: ({
        rkey: _r,
        collapsed: _c,
        expandedH: _e,
        readOnly: _o,
        ...props
      }) => props,
    },
  ],
});

// A collection as a container: cards dragged in join it, cards dragged out leave it
export class CollectionShapeUtil extends BaseFrameLikeShapeUtil<CollectionShape> {
  static override type = COLLECTION_TYPE;
  static override props: RecordProps<CollectionShape> = {
    w: T.number,
    h: T.number,
    collectionId: T.string,
    name: T.string,
    description: T.string,
    accessType: T.literalEnum('OPEN', 'CLOSED'),
    authorHandle: T.string,
    authorAvatarUrl: T.string,
    rkey: T.string,
    collapsed: T.boolean,
    expandedH: T.number,
    readOnly: T.boolean,
  };
  static override migrations = migrations;

  getDefaultProps(): CollectionShape['props'] {
    return {
      w: 400,
      h: 240,
      collectionId: '',
      name: '',
      description: '',
      accessType: 'CLOSED',
      authorHandle: '',
      authorAvatarUrl: '',
      rkey: '',
      collapsed: false,
      expandedH: 240,
      readOnly: false,
    };
  }

  override canEdit() {
    return false;
  }

  override hideRotateHandle() {
    return true;
  }

  override canResize(shape: CollectionShape) {
    return !shape.props.collapsed;
  }

  override canReceiveNewChildrenOfType(shape: CollectionShape) {
    return !shape.props.readOnly && !shape.props.collapsed && !shape.isLocked;
  }

  override canRemoveChildrenOfType(shape: CollectionShape) {
    return !shape.props.readOnly && !shape.isLocked;
  }

  // Frame-like shapes are picked by their label, so the header is the label
  override getText(shape: CollectionShape) {
    return shape.props.name || 'Collection';
  }

  override getGeometry(shape: CollectionShape, opts?: TLGeometryOpts) {
    if (opts?.context === '@tldraw/arrow-without-arrowhead') {
      return new Rectangle2d({
        x: -ARROW_TAIL_GAP,
        y: -ARROW_TAIL_GAP,
        width: shape.props.w + ARROW_TAIL_GAP * 2,
        height: shape.props.h + ARROW_TAIL_GAP * 2,
        isFilled: true,
      });
    }
    return new Group2d({
      children: [
        new Rectangle2d({
          width: shape.props.w,
          height: shape.props.h,
          isFilled: false,
        }),
        new Rectangle2d({
          width: shape.props.w,
          height: COLLECTION_HEADER_H,
          isFilled: true,
          isLabel: true,
        }),
      ],
    });
  }

  override getClipPath(shape: CollectionShape) {
    const { w, h } = shape.props;
    return [new Vec(0, 0), new Vec(w, 0), new Vec(w, h), new Vec(0, h)];
  }

  component(shape: CollectionShape) {
    return (
      <HTMLContainer>
        <CollectionShapeBody shape={shape} />
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: CollectionShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 16);
    return path;
  }
}
