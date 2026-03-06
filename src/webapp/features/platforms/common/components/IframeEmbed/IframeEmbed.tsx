import { getDomain } from '@/lib/utils/link';
import {
  Anchor,
  Text,
  Card,
  Stack,
  Tooltip,
  AspectRatio,
  MantineRadius,
} from '@mantine/core';
import { UrlCard } from '@semble/types';
import Link from 'next/link';
import { Fragment } from 'react';

interface IframeEmbedProps {
  url: string;
  cardContent: UrlCard['cardContent'];
  height?: number | string;
  aspectRatio?: number;
  radius?: MantineRadius;
}

export default function IframeEmbed(props: IframeEmbedProps) {
  const domain = getDomain(props.url);
  const height = props.height ?? 200;

  const iframeElement = (
    <Card p={0} radius={props.radius ?? 'md'}>
      <iframe
        src={props.url}
        height={props.aspectRatio ? '100%' : height}
        allowFullScreen
        style={{ border: 0 }}
      />
    </Card>
  );

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
          <Text c={'bright'} lineClamp={2} fw={500}>
            {props.cardContent.title}
          </Text>
        )}
      </Stack>

      {props.aspectRatio ? (
        <AspectRatio ratio={props.aspectRatio}>{iframeElement}</AspectRatio>
      ) : (
        iframeElement
      )}
    </Fragment>
  );
}
