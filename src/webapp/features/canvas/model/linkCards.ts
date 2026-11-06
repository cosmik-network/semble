import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
  type AppBskyFeedDefs,
} from '@atproto/api';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import {
  getModerationReasonText,
  getPostModerationUI,
} from '@/features/platforms/bluesky/lib/moderation';
import type { User } from '@semble/types';
import type { LinkInfo } from '../server/canvasServer';

export const LINK_CARD_TYPE = 'link-card';
export const LINK_CARD_WIDTH = 360;

// The card a copy shows when a collection frame placed it: whoever added the
// entry, with their note. Kept in the copy's meta.
export interface EntryCard {
  author: User;
  note: { id: string; text: string } | null;
  // As on the collection page: when the card isn't the collection owner's
  byRow: boolean;
}

export const ENTRY_META_KEY = 'entry';

export function entryCardOf(meta: object): EntryCard | null {
  const value = (meta as Record<string, unknown>)[ENTRY_META_KEY];
  return value ? (value as EntryCard) : null;
}

// The note a copy shows: its entry's, or else the viewer's own
export function shownNote(link: LinkInfo | undefined, entry: EntryCard | null) {
  if (entry) {
    return entry.note ? { ...entry.note, author: entry.author } : null;
  }
  return link?.note ?? null;
}

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

// Live embeds take clicks, load a page per card and change height as they
// load, so the board shows a still of the platforms the webapp embeds
export type LinkCardPreview =
  | { kind: 'plain' }
  | { kind: 'video'; imageUrl: string }
  | { kind: 'audio'; imageUrl: string; label: string }
  | {
      kind: 'post';
      author: { name: string; avatarUrl: string | null };
      text: string;
      media: PostMedia | null;
      quote: PostQuote | null;
      // Shown in the media's place until the viewer shows it
      mediaHiddenBecause: string | null;
    };

// Images show up to four in a grid, a video its poster, and a link the
// compact card of the webapp's grid view
export type PostMedia =
  | {
      kind: 'images' | 'video';
      images: { url: string; alt: string }[];
      height: number;
    }
  | {
      kind: 'link';
      url: string;
      title: string;
      thumbUrl: string | null;
      height: number;
    };

// As the webapp's ImageEmbed and VideoEmbed: a single still keeps its ratio,
// no taller than 16:9, and a grid is cropped to 16:9
function stillHeight(ratio: { width: number; height: number } | undefined) {
  if (!ratio) return WIDE_IMAGE_HEIGHT;
  return Math.min(
    Math.round((INNER_WIDTH * ratio.height) / ratio.width),
    WIDE_IMAGE_HEIGHT,
  );
}

// The webapp's grid view shows a quoted post's author and first line, and none
// of its embeds
export interface PostQuote {
  author: { name: string; avatarUrl: string | null };
  text: string;
}

function postQuote(embed: AppBskyFeedDefs.PostView['embed']): PostQuote | null {
  let record: AppBskyEmbedRecord.View['record'] | undefined;
  if (AppBskyEmbedRecord.isView(embed)) record = embed.record;
  if (AppBskyEmbedRecordWithMedia.isView(embed)) record = embed.record.record;
  if (!record || !AppBskyEmbedRecord.isViewRecord(record)) return null;
  return {
    author: {
      name: record.author.displayName || record.author.handle,
      avatarUrl: record.author.avatar ?? null,
    },
    text: (record.value as AppBskyFeedPost.Record).text,
  };
}

function postMedia(embed: AppBskyFeedDefs.PostView['embed']): PostMedia | null {
  if (AppBskyEmbedRecordWithMedia.isView(embed)) return postMedia(embed.media);
  if (AppBskyEmbedImages.isView(embed) && embed.images.length > 0) {
    const images = embed.images.slice(0, 4);
    return {
      kind: 'images',
      images: images.map((image) => ({ url: image.thumb, alt: image.alt })),
      height:
        images.length === 1
          ? stillHeight(images[0].aspectRatio)
          : WIDE_IMAGE_HEIGHT,
    };
  }
  if (AppBskyEmbedVideo.isView(embed) && embed.thumbnail) {
    return {
      kind: 'video',
      images: [{ url: embed.thumbnail, alt: embed.alt ?? '' }],
      height: stillHeight(embed.aspectRatio),
    };
  }
  if (AppBskyEmbedExternal.isView(embed)) {
    return {
      kind: 'link',
      url: embed.external.uri,
      title: embed.external.title,
      thumbUrl: embed.external.thumb ?? null,
      height: EMBEDDED_LINK_HEIGHT,
    };
  }
  return null;
}

// Moderated in the webapp's 'contentMedia' context, which never filters a
// post. Labels hide only the media, as the face can't be clicked to show the
// rest.
function postPreview(post: AppBskyFeedDefs.PostView): LinkCardPreview {
  const moderation = getPostModerationUI(post);
  const record = post.record as AppBskyFeedPost.Record;
  const media = postMedia(post.embed);
  return {
    kind: 'post',
    author: {
      name: post.author.displayName || post.author.handle,
      avatarUrl: post.author.avatar ?? null,
    },
    text: record.text,
    media,
    quote: postQuote(post.embed),
    mediaHiddenBecause:
      media && moderation.blur ? getModerationReasonText(moderation) : null,
  };
}

const AUDIO_LABELS: Partial<Record<SupportedPlatform, string>> = {
  [SupportedPlatform.SPOTIFY]: 'Spotify',
  [SupportedPlatform.SOUNDCLOUD_TRACK]: 'SoundCloud',
  [SupportedPlatform.SOUNDCLOUD_SET]: 'SoundCloud',
  [SupportedPlatform.BANDCAMP_ALBUM]: 'Bandcamp',
  [SupportedPlatform.BANDCAMP_TRACK]: 'Bandcamp',
  [SupportedPlatform.PLYRFM_TRACK]: 'plyr.fm',
};

function previewOf(link: LinkInfo): LinkCardPreview {
  if (link.post) return postPreview(link.post);
  const platform = detectUrlPlatform(link.url).type;
  const imageUrl = link.metadata.imageUrl;
  if (platform === SupportedPlatform.YOUTUBE_VIDEO && imageUrl) {
    return { kind: 'video', imageUrl };
  }
  const label = AUDIO_LABELS[platform];
  if (label && imageUrl) return { kind: 'audio', imageUrl, label };
  return { kind: 'plain' };
}

// Moderating a post is too slow to repeat each time a card is sized or drawn.
// A fetch replaces the link, so it's worked out once per fetch.
const previews = new WeakMap<LinkInfo, LinkCardPreview>();

export function linkCardPreview(link: LinkInfo | undefined): LinkCardPreview {
  if (!link) return { kind: 'plain' };
  let preview = previews.get(link);
  if (!preview) {
    preview = previewOf(link);
    previews.set(link, preview);
  }
  return preview;
}

export interface TextFont {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  // Laid out as RichTextRenderer does: line breaks kept, long words broken
  richText: boolean;
}

export type CountLines = (
  text: string,
  font: TextFont,
  width: number,
) => number;

const TITLE_FONT: TextFont = {
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.55,
  richText: false,
};
const DESCRIPTION_FONT: TextFont = {
  ...TITLE_FONT,
  fontSize: 14,
  fontWeight: 400,
};
const POST_FONT: TextFont = {
  ...TITLE_FONT,
  fontWeight: 400,
  richText: true,
};
const NOTE_FONT: TextFont = {
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.55,
  richText: true,
};

export interface LinkCardParts {
  preview: LinkCardPreview;
  titleLines: number;
  descriptionLines: number;
  postLines: number;
  image: boolean;
  // None without a note
  noteLines: number;
  byRow: boolean;
}

export function linkCardParts(
  link: LinkInfo | undefined,
  countLines: CountLines,
  entry: EntryCard | null = null,
): LinkCardParts {
  const preview = linkCardPreview(link);
  const lines = (
    text: string | undefined,
    font: TextFont,
    width: number,
    max: number,
  ) => (text ? Math.min(Math.max(countLines(text, font, width), 1), max) : 0);
  const image = !!link?.metadata.imageUrl;
  const textWidth =
    preview.kind === 'audio'
      ? INNER_WIDTH - ARTWORK_SIZE - BESIDE_IMAGE_GAP
      : preview.kind === 'plain' && image
        ? INNER_WIDTH - IMAGE_SIZE - BESIDE_IMAGE_GAP
        : INNER_WIDTH;
  const note = shownNote(link, entry);
  // Only the parts the preview draws are measured
  return {
    preview,
    titleLines:
      preview.kind === 'post'
        ? 0
        : lines(link?.metadata.title, TITLE_FONT, textWidth, TITLE_LINES),
    descriptionLines:
      preview.kind === 'plain'
        ? lines(
            link?.metadata.description,
            DESCRIPTION_FONT,
            textWidth,
            DESCRIPTION_LINES,
          )
        : 0,
    postLines:
      preview.kind === 'post'
        ? lines(preview.text, POST_FONT, INNER_WIDTH, POST_LINES)
        : 0,
    image,
    noteLines: note
      ? Math.max(lines(note.text, NOTE_FONT, NOTE_TEXT_WIDTH, NOTE_LINES), 1)
      : 0,
    byRow: !!entry?.byRow,
  };
}

// Text is cut to at most a few lines and images have fixed shapes, so a
// card's height follows from its link, with only its text measured. The sizes
// mirror LinkCardContent's grid view and NoteCardInline; the face clips each
// part to them.
export const LINK_CARD_PADDING = 12;
export const LINK_CARD_GAP = 12;
const PADDING = LINK_CARD_PADDING;
const GAP = LINK_CARD_GAP;
const INNER_WIDTH = LINK_CARD_WIDTH - PADDING * 2;
const DOMAIN_HEIGHT = 22;
const LABEL_HEIGHT = 22;
const TITLE_LINE = 25;
const TITLE_LINES = 2;
const DESCRIPTION_MARGIN = 10;
const DESCRIPTION_LINE = 22;
const DESCRIPTION_LINES = 3;
const IMAGE_SIZE = 75;
const BESIDE_IMAGE_GAP = 20;
// The thumbnail, framed in the card's padding and border
export const EMBEDDED_LINK_THUMB = 50;
const EMBEDDED_LINK_HEIGHT = EMBEDDED_LINK_THUMB + 10 * 2 + 2;
export const WIDE_IMAGE_HEIGHT = (INNER_WIDTH * 9) / 16;
export const PREVIEW_MARGIN = 10;
export const ARTWORK_SIZE = 120;
export const AVATAR_SIZE = 26;
const POST_LINE = 25;
// Padding and border round the author and the first line of text
const QUOTE_PADDING = 12;
const quoteHeight = (quote: PostQuote) =>
  QUOTE_PADDING * 2 +
  2 +
  AVATAR_SIZE +
  (quote.text ? PREVIEW_MARGIN + POST_LINE : 0);
export const POST_LINES = 3;
const NOTE_PADDING = 10;
const NOTE_TEXT_WIDTH = INNER_WIDTH - NOTE_PADDING * 2;
const NOTE_AUTHOR_HEIGHT = 20;
// NoteCardInline's gap between the author and the text
const NOTE_GAP = 10;
const NOTE_LINE = 22;
export const NOTE_LINES = 4;
const BY_ROW_HEIGHT = 20;

function contentHeight(parts: LinkCardParts) {
  const titleHeight = TITLE_LINE * parts.titleLines;
  const preview = parts.preview;
  switch (preview.kind) {
    case 'post': {
      return (
        AVATAR_SIZE +
        (parts.postLines ? PREVIEW_MARGIN + POST_LINE * parts.postLines : 0) +
        (preview.media ? PREVIEW_MARGIN + preview.media.height : 0) +
        (preview.quote ? PREVIEW_MARGIN + quoteHeight(preview.quote) : 0)
      );
    }
    case 'video':
      return WIDE_IMAGE_HEIGHT + PREVIEW_MARGIN + DOMAIN_HEIGHT + titleHeight;
    case 'audio':
      return Math.max(ARTWORK_SIZE, LABEL_HEIGHT + titleHeight + DOMAIN_HEIGHT);
    case 'plain': {
      const textHeight =
        DOMAIN_HEIGHT +
        titleHeight +
        (parts.descriptionLines
          ? DESCRIPTION_MARGIN + DESCRIPTION_LINE * parts.descriptionLines
          : 0);
      return parts.image ? Math.max(textHeight, IMAGE_SIZE) : textHeight;
    }
  }
}

// The link's content, the card's padding, and the By row and the note, sized
// to its text, under it
export function linkCardHeight(parts: LinkCardParts) {
  const noteHeight = parts.noteLines
    ? NOTE_PADDING * 2 +
      NOTE_AUTHOR_HEIGHT +
      NOTE_GAP +
      NOTE_LINE * parts.noteLines
    : 0;
  return (
    contentHeight(parts) +
    PADDING * 2 +
    (parts.byRow ? GAP + BY_ROW_HEIGHT : 0) +
    (noteHeight ? GAP + noteHeight : 0)
  );
}
