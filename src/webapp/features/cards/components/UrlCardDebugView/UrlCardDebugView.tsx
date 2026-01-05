'use client';

import { CodeHighlightTabs } from '@mantine/code-highlight';
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
          fileName: 'Content',
          code: JSON.stringify(props.cardContent, null, 2),
          language: 'json',
        },
        {
          fileName: 'Author',
          code: JSON.stringify(props.cardAuthor, null, 2),
          language: 'json',
        },
      ]}
      radius="md"
      withBorder
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'auto', zIndex: 0 }}
      defaultExpanded={false}
    />
  );
}
