'use client';

import {
  CodeHighlightControl,
  CodeHighlightTabs,
} from '@mantine/code-highlight';
import { TbBinaryTreeFilled } from 'react-icons/tb';
import type { UrlCard, User } from '@/api-client';

interface Props {
  cardContent: UrlCard['cardContent'];
  cardAuthor?: User;
}

export default function UrlCardDebugView(props: Props) {
  return (
    <CodeHighlightTabs
      code={[
        {
          fileName: 'Card content',
          code: JSON.stringify(props.cardContent, null, 2),
          language: 'json',
        },
        {
          fileName: 'Card author',
          code: JSON.stringify(props.cardAuthor, null, 2),
          language: 'json',
        },
      ]}
      controls={[
        <CodeHighlightControl
          key="pdsls"
          component="a"
          href={`https://pdsls.dev/at://${props.cardAuthor?.id}/${
            process.env.NODE_ENV
              ? 'network.cosmik.dev.card'
              : 'network.cosmik.card'
          }`}
          target="_blank"
          tooltipLabel="View cards on pdsls"
        >
          <TbBinaryTreeFilled fill="#76c4e5" />
        </CodeHighlightControl>,
      ]}
      radius="md"
      withBorder
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'auto' }}
      defaultExpanded={false}
    />
  );
}
