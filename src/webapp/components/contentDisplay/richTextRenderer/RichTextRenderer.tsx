'use client';

import { RichText } from '@atproto/api';
import Link from 'next/link';
import { Anchor, AnchorProps, Text, TextProps } from '@mantine/core';
import { getDomain } from '@/lib/utils/link';

interface Props {
  text: string;
  linkProps?: Partial<AnchorProps>; // for mentions, links, hashtags
  textProps?: Partial<TextProps>; // for plain text
}

export default function RichTextRenderer({
  text,
  linkProps = {},
  textProps = {},
}: Props) {
  const richText = new RichText({ text });
  richText.detectFacetsWithoutResolution();

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
              component={Link}
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
              {getDomain(segment.link.uri)}
            </Anchor>
          );
        }

        // hashtag
        if (segment.isTag()) {
          const encodedTag = encodeURIComponent(segment.tag?.tag || '');
          return (
            <Anchor
              key={`tag-${i}`}
              component={Link}
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
