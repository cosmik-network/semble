'use client';

import { AppBskyRichtextFacet, RichText } from '@atproto/api';

import { Anchor, AnchorProps, Text, TextProps } from '@mantine/core';
import { getDisplayUrl } from '@/lib/utils/link';

const MAX_LINK_PATH_LENGTH = 30;

interface Props {
  text: string;
  linkProps?: Partial<AnchorProps>; // for mentions, links, hashtags
  textProps?: Partial<TextProps>; // for plain text
  linkDisplay?: 'short' | 'full'; // 'short' cuts off long paths (default)
  // A record's own facets. Pass them whenever the source has them: Bluesky stores post
  // text with long links already shortened, so the real URL only lives in the facet and
  // re-detecting from the text would give a broken href.
  facets?: AppBskyRichtextFacet.Main[];
}

export default function RichTextRenderer({
  text,
  linkProps = {},
  textProps = {},
  linkDisplay = 'short',
  facets,
}: Props) {
  const richText = new RichText({ text, facets });
  if (!facets?.length) {
    richText.detectFacetsWithoutResolution();
  }

  return (
    <Text
      {...textProps}
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        ...(textProps?.style || {}),
      }}
    >
      {Array.from(richText.segments()).map((segment, i) => {
        // mention
        if (segment.isMention()) {
          return (
            <Anchor
              key={`mention-${i}`}
              href={`/profile/${segment.text.slice(1)}`}
              c={linkProps.c || 'blue'}
              fw={linkProps.fw || 500}
              onClick={(e) => e.stopPropagation()}
              {...linkProps}
            >
              {segment.text}
            </Anchor>
          );
        }

        // link
        if (segment.isLink() && segment.link?.uri) {
          return (
            <Anchor
              key={`link-${i}`}
              href={segment.link.uri}
              c={linkProps.c || 'blue'}
              fw={linkProps.fw || 500}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              {...linkProps}
            >
              {getDisplayUrl(
                segment.link.uri,
                linkDisplay === 'full' ? Infinity : MAX_LINK_PATH_LENGTH,
              )}
            </Anchor>
          );
        }

        // hashtag
        if (segment.isTag()) {
          const encodedTag = encodeURIComponent(segment.tag?.tag || '');
          return (
            <Anchor
              key={`tag-${i}`}
              c={linkProps.c || 'blue'}
              fw={linkProps.fw || 500}
              href={`https://bsky.app/hashtag/${encodedTag}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              {...linkProps}
            >
              {segment.text}
            </Anchor>
          );
        }

        // plain text
        return (
          <span key={`text-${i}`} className={textProps?.className}>
            {segment.text}
          </span>
        );
      })}
    </Text>
  );
}
