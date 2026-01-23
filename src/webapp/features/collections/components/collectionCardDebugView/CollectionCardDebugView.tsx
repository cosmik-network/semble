'use client';

import {
  CodeHighlightControl,
  CodeHighlightTabs,
} from '@mantine/code-highlight';
import { TbBinaryTreeFilled } from 'react-icons/tb';
import type { Collection } from '@/api-client';

interface Props {
  collection: Collection;
}

export default function CollectionCardDebugView(props: Props) {
  const { author, ...content } = props.collection;

  return (
    <CodeHighlightTabs
      code={[
        {
          fileName: 'Content',
          // 2. Use the new object that excludes the author
          code: JSON.stringify(content, null, 2),
          language: 'json',
        },
        {
          fileName: 'Author',
          // 3. Use the extracted author property here
          code: JSON.stringify(author, null, 2),
          language: 'json',
        },
      ]}
      controls={[
        <CodeHighlightControl
          key="pdsls"
          component="a"
          href={`https://pds.ls/${props.collection.uri}`}
          target="_blank"
          tooltipLabel="View collection on pdsls"
        >
          <TbBinaryTreeFilled fill="#76c4e5" />
        </CodeHighlightControl>,
      ]}
      radius="md"
      withBorder
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'auto', zIndex: 0 }}
      defaultExpanded={false}
    />
  );
}
