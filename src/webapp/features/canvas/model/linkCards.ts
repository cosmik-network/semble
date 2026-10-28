import type { LinkInfo } from '../server/canvasServer';

export const LINK_CARD_TYPE = 'link-card';
export const LINK_CARD_WIDTH = 360;

// The server's URL.create rule: trimmed, with a slash added to a bare root.
// Null for anything that isn't an http(s) URL.
export function linkKey(input: string): string | null {
  const trimmed = input.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const isBareRoot =
    parsed.pathname === '/' && parsed.search === '' && parsed.hash === '';
  return isBareRoot && !trimmed.endsWith('/') ? `${trimmed}/` : trimmed;
}

// Copies of a link count once
export function countLinks(store: Record<string, unknown>): number {
  const urls = new Set<string>();
  for (const record of Object.values(store)) {
    const shape = record as {
      typeName?: string;
      type?: string;
      props?: { url?: string };
    };
    if (
      shape.typeName === 'shape' &&
      shape.type === LINK_CARD_TYPE &&
      shape.props?.url
    ) {
      urls.add(shape.props.url);
    }
  }
  return urls.size;
}

export interface LinkCardParts {
  title: boolean;
  description: boolean;
  image: boolean;
  note: boolean;
}

export function linkCardParts(link: LinkInfo | undefined): LinkCardParts {
  return {
    title: !!link?.metadata.title,
    description: !!link?.metadata.description,
    image: !!link?.metadata.imageUrl,
    note: !!link?.note,
  };
}

// Text is cut to fixed line counts and the image is a fixed square, so a card's
// height follows from which parts it shows, with nothing measured. The sizes
// mirror LinkCardContent's grid view and NoteCardInline; the face clips each
// part to them.
const PADDING = 12;
const GAP = 12;
const DOMAIN_HEIGHT = 22;
const TITLE_LINE = 25;
const TITLE_LINES = 2;
const DESCRIPTION_MARGIN = 10;
const DESCRIPTION_LINE = 22;
const DESCRIPTION_LINES = 3;
const IMAGE_SIZE = 75;
const NOTE_PADDING = 10;
const NOTE_AUTHOR_HEIGHT = 20;
const NOTE_LINE = 22;
export const NOTE_LINES = 4;

export interface LinkCardLayout {
  contentHeight: number;
  noteHeight: number;
  gap: number;
  padding: number;
  height: number;
}

export function linkCardLayout(parts: LinkCardParts): LinkCardLayout {
  const textHeight =
    DOMAIN_HEIGHT +
    (parts.title ? TITLE_LINE * TITLE_LINES : 0) +
    (parts.description
      ? DESCRIPTION_MARGIN + DESCRIPTION_LINE * DESCRIPTION_LINES
      : 0);
  const contentHeight = parts.image
    ? Math.max(textHeight, IMAGE_SIZE)
    : textHeight;
  const noteHeight = parts.note
    ? NOTE_PADDING * 2 + NOTE_AUTHOR_HEIGHT + GAP + NOTE_LINE * NOTE_LINES
    : 0;
  return {
    contentHeight,
    noteHeight,
    gap: GAP,
    padding: PADDING,
    height: PADDING * 2 + contentHeight + (parts.note ? GAP + noteHeight : 0),
  };
}
