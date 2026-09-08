import type { ReactNode } from 'react';
import parse, {
  domToReact,
  Element,
  Text,
  type DOMNode,
  type HTMLReactParserOptions,
} from 'html-react-parser';
import ReaderArticleLink from '../components/ReaderArticleLink/ReaderArticleLink';
import { toReaderLink } from './utils/readerLink';

interface Options {
  articleUrl: string;
  showLinks: boolean;
  isHoverDevice: boolean;
}

function getText(nodes: DOMNode[]): string {
  return nodes
    .map((node) => {
      if (node instanceof Text) return node.data;
      if (node instanceof Element) return getText(node.children as DOMNode[]);
      return '';
    })
    .join('');
}

/** Article HTML to React. Reader links become interactive; other anchors (and all of them when hidden) render as text. */
export function parseReaderContent(html: string, options: Options): ReactNode {
  let nextId = 0;

  const parserOptions: HTMLReactParserOptions = {
    replace(domNode) {
      if (!(domNode instanceof Element) || domNode.name !== 'a') return;

      const children = domNode.children as DOMNode[];
      const link = options.showLinks
        ? toReaderLink(
            domNode.attribs.href ?? '',
            getText(children),
            options.articleUrl,
          )
        : null;

      if (!link) return <>{domToReact(children, parserOptions)}</>;

      return (
        <ReaderArticleLink
          id={nextId++}
          link={link}
          isHoverDevice={options.isHoverDevice}
        >
          {domToReact(children, parserOptions)}
        </ReaderArticleLink>
      );
    },
  };

  return parse(html, parserOptions);
}
