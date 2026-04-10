import { Title, Text, List, ListItem, Anchor } from '@mantine/core';
import type { MDXComponents } from 'mdx/types';


const components: MDXComponents = {
  h1: ({ children }) => <Title order={1}>{children}</Title>,
  h2: ({ children }) => <Title order={2}>{children}</Title>,
  h3: ({ children }) => <Title order={3}>{children}</Title>,
  h4: ({ children }) => <Title order={4}>{children}</Title>,
  p: ({ children }) => <Text fw={500}>{children}</Text>,
  a: ({ children, href }) => (
    <Anchor href={href} c="blue" fw={600}>
      {children}
    </Anchor>
  ),
  ul: ({ children }) => <List type="unordered">{children}</List>,
  ol: ({ children }) => <List type="ordered">{children}</List>,
  li: ({ children }) => <ListItem fw={500}>{children}</ListItem>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
