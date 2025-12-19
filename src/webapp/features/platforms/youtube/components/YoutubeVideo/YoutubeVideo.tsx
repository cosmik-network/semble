import { getDomain } from '@/lib/utils/link';
import { Anchor, AspectRatio, Card, Stack, Tooltip } from '@mantine/core';
import { UrlCard } from '@semble/types';
import Link from 'next/link';
import { Fragment } from 'react';

interface Props {
  url: string;
  cardContent: UrlCard['cardContent'];
}

export default function YoutubeVideo(props: Props) {
  const domain = getDomain(props.url);

  return (
    <Fragment>
      <Stack gap={0} flex={1}>
        <Tooltip label={props.cardContent.url}>
          <Anchor
            onClick={(e) => e.stopPropagation()}
            component={Link}
            href={props.cardContent.url}
            target="_blank"
            c={'gray'}
            fz={'sm'}
            lineClamp={1}
            w={'fit-content'}
          >
            {domain}
          </Anchor>
        </Tooltip>
        {props.cardContent.title && (
          <Anchor
            onClick={(e) => e.stopPropagation()}
            component={Link}
            href={props.cardContent.url}
            target="_blank"
            c={'bright'}
            lineClamp={2}
            fw={500}
            w={'fit-content'}
          >
            {props.cardContent.title}
          </Anchor>
        )}
      </Stack>
      <AspectRatio ratio={16 / 8}>
        <Card p={0}>
          <iframe
            src={props.url}
            height={'100%'}
            allowFullScreen
            style={{ border: 0 }}
          />
        </Card>
      </AspectRatio>
    </Fragment>
  );
}
