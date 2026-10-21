import {
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  HTMLContainer,
  Rectangle2d,
  T,
  TLGeometryOpts,
  TLShape,
  type RecordProps,
} from 'tldraw';
import CardShapeBody from '../../components/cardShapeBody/CardShapeBody';
import { ARROW_TAIL_GAP, CARD_H, CARD_TYPE, CARD_W } from '../../const';

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [CARD_TYPE]: {
      w: number;
      h: number;
      url: string;
      // Empty until the card is saved to the user's library
      cardId: string;
      title: string;
      description: string;
      imageUrl: string;
      siteName: string;
      status: 'loading' | 'ready' | 'error';
      size: CardSize;
      // A suggestion shown on the canvas but not saved anywhere
      ghost: boolean;
      note: string;
      // Cards sharing an id form a pile; empty when loose
      stackId: string;
      // This copy's connection arrows are hidden
      hideConnections: boolean;
    };
  }
}

export type CardSize = 'compact' | 'standard' | 'large';
export type CardShape = TLShape<typeof CARD_TYPE>;

const versions = createShapePropsMigrationIds(CARD_TYPE, {
  AddDescription: 1,
  AddSizeGhostNote: 2,
  AddStack: 3,
  AddHideConnections: 4,
});

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.AddDescription,
      up: (props) => ({ ...props, description: '', w: CARD_W }),
      down: ({ description: _, ...props }) => props,
    },
    {
      id: versions.AddSizeGhostNote,
      up: (props) => ({ ...props, size: 'standard', ghost: false, note: '' }),
      down: ({ size: _s, ghost: _g, note: _n, ...props }) => props,
    },
    {
      id: versions.AddStack,
      up: (props) => ({ ...props, stackId: '' }),
      down: ({ stackId: _, ...props }) => props,
    },
    {
      id: versions.AddHideConnections,
      up: (props) => ({ ...props, hideConnections: false }),
      down: ({ hideConnections: _, ...props }) => props,
    },
  ],
});

export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
  static override type = CARD_TYPE;
  static override props: RecordProps<CardShape> = {
    w: T.number,
    h: T.number,
    url: T.string,
    cardId: T.string,
    title: T.string,
    description: T.string,
    imageUrl: T.string,
    siteName: T.string,
    status: T.literalEnum('loading', 'ready', 'error'),
    size: T.literalEnum('compact', 'standard', 'large'),
    ghost: T.boolean,
    note: T.string,
    stackId: T.string,
    hideConnections: T.boolean,
  };
  static override migrations = migrations;

  override getGeometry(shape: CardShape, opts?: TLGeometryOpts) {
    const pad =
      opts?.context === '@tldraw/arrow-without-arrowhead' ? ARROW_TAIL_GAP : 0;
    return new Rectangle2d({
      x: -pad,
      y: -pad,
      width: shape.props.w + pad * 2,
      height: shape.props.h + pad * 2,
      isFilled: true,
    });
  }

  getDefaultProps(): CardShape['props'] {
    return {
      w: CARD_W,
      h: CARD_H,
      url: '',
      cardId: '',
      title: '',
      description: '',
      imageUrl: '',
      siteName: '',
      status: 'loading',
      size: 'standard',
      ghost: false,
      note: '',
      stackId: '',
      hideConnections: false,
    };
  }

  override canResize() {
    return false;
  }

  override canEdit() {
    return false;
  }

  override hideRotateHandle() {
    return true;
  }

  component(shape: CardShape) {
    return (
      <HTMLContainer>
        <CardShapeBody shape={shape} />
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: CardShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 12);
    return path;
  }
}
