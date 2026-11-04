import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  createShapePropsMigrationSequence,
  type Editor,
  type RecordProps,
  type TLBaseShape,
} from 'tldraw';
import {
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  entryCardOf,
  linkCardHeight,
  linkCardParts,
} from '../../model/linkCards';
import LinkCardFace from '../../components/linkCardFace/LinkCardFace';

export type LinkCardShape = TLBaseShape<
  typeof LINK_CARD_TYPE,
  {
    url: string;
    // Follows from the card's content, set by the controller
    h: number;
    hideArrows: boolean;
    // The card shown: whoever added a collection entry, or null for the
    // viewer's own
    cardId: string | null;
  }
>;

export function linkCardsOn(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .filter((shape): shape is LinkCardShape => shape.type === LINK_CARD_TYPE);
}

export class LinkCardShapeUtil extends ShapeUtil<LinkCardShape> {
  static override type = LINK_CARD_TYPE;
  static override props: RecordProps<LinkCardShape> = {
    url: T.string,
    h: T.positiveNumber,
    hideArrows: T.boolean,
    cardId: T.string.nullable(),
  };
  static override migrations = createShapePropsMigrationSequence({
    sequence: [],
  });

  getDefaultProps(): LinkCardShape['props'] {
    return {
      url: '',
      h: linkCardHeight(linkCardParts(undefined, () => 0)),
      hideArrows: false,
      cardId: null,
    };
  }

  getGeometry(shape: LinkCardShape) {
    return new Rectangle2d({
      width: LINK_CARD_WIDTH,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return false;
  }

  override hideResizeHandles() {
    return true;
  }

  component(shape: LinkCardShape) {
    return (
      <HTMLContainer>
        <LinkCardFace
          id={shape.id}
          url={shape.props.url}
          height={shape.props.h}
          entry={entryCardOf(shape.meta)}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LinkCardShape) {
    return (
      <rect width={LINK_CARD_WIDTH} height={shape.props.h} rx={16} ry={16} />
    );
  }
}
