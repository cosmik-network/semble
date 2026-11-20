'use client';

import { useState, type ReactNode } from 'react';
import { Box, Button, ThemeIcon, UnstyledButton } from '@mantine/core';
import { TbCirclePlus, TbEyeOff } from 'react-icons/tb';
import {
  getPostUrl,
  type ListItem,
  type ThreadIndex,
  type TreeNode,
} from '../../lib/thread';
import {
  postTombstone,
  ThreadAnchorPost,
  ThreadLinearPost,
  ThreadTombstone,
  ThreadTreePost,
} from '../threadPost/ThreadPost';
import classes from '../threadPost/ThreadPost.module.css';

/** Levels below the top-level reply that still step right */
const MAX_INDENT = 5;
const VISIBLE_REPLIES = 3;

export interface ThreadRenderContext {
  rootAuthorDid?: string;
  postOrigin: string;
  fontSize: number;
  highlightedUri: string | null;
  /** The focused post and its ancestors, which must stay expanded */
  revealPath: ReadonlySet<string>;
  loading: ReadonlySet<string>;
  failed: ReadonlySet<string>;
  onLoadMore: (uri: string) => void;
}

function ReadMore(props: {
  onClick: () => void;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      variant="light"
      color="gray"
      size="compact-sm"
      radius="xl"
      fw={500}
      leftSection={<TbCirclePlus size={16} strokeWidth={(1.75 * 24) / 16} />}
      loading={props.loading}
      onClick={props.onClick}
      style={{ alignSelf: 'flex-start' }}
    >
      {props.children}
    </Button>
  );
}

function LoadMore(props: { node: TreeNode; ctx: ThreadRenderContext }) {
  const uri = props.node.entry.uri;
  if (!props.node.hasMore || props.node.entry.kind !== 'post') return null;
  const failed = props.ctx.failed.has(uri);

  return (
    <ReadMore
      loading={props.ctx.loading.has(uri)}
      onClick={() => props.ctx.onLoadMore(uri)}
    >
      {failed ? 'Could not load replies, try again' : 'Read more replies'}
    </ReadMore>
  );
}

function Branch(props: {
  last: boolean;
  indent: boolean;
  children: ReactNode;
}) {
  if (!props.indent) return props.children;
  return (
    <Box className={classes.branch}>
      {!props.last && <Box className={classes.branchThrough} />}
      <Box className={classes.branchElbow} />
      {props.children}
    </Box>
  );
}

function tombstoneOf(node: TreeNode) {
  const entry = node.entry;
  return entry.kind === 'post' ? postTombstone(entry.post) : entry.kind;
}

function tombstoneHref(entry: TreeNode['entry'], ctx: ThreadRenderContext) {
  return entry.kind === 'post'
    ? getPostUrl(entry.post, ctx.postOrigin)
    : undefined;
}

function TreeNodeView(props: {
  node: TreeNode;
  /** 1 for replies to the root */
  depth: number;
  ctx: ThreadRenderContext;
}) {
  const entry = props.node.entry;

  const revealed = props.node.children.some((child) =>
    props.ctx.revealPath.has(child.entry.uri),
  );
  const [expanded, setExpanded] = useState(false);
  const visible =
    expanded || revealed
      ? props.node.children
      : props.node.children.slice(0, VISIBLE_REPLIES);
  const collapsed = props.node.children.length - visible.length;

  const items: { key: string; content: ReactNode }[] = visible.map((child) => ({
    key: child.entry.uri,
    content: (
      <TreeNodeView node={child} depth={props.depth + 1} ctx={props.ctx} />
    ),
  }));
  if (collapsed > 0) {
    items.push({
      key: 'collapsed',
      content: (
        <Box pt="xs">
          <ReadMore onClick={() => setExpanded(true)}>
            Read {collapsed} more {collapsed === 1 ? 'reply' : 'replies'}
          </ReadMore>
        </Box>
      ),
    });
  }
  if (props.node.hasMore) {
    items.push({
      key: 'load-more',
      content: (
        <Box pt="xs">
          <LoadMore node={props.node} ctx={props.ctx} />
        </Box>
      ),
    });
  }

  const tombstone = tombstoneOf(props.node);
  // Tombstones have no avatar to draw a line from
  const indent = props.depth <= MAX_INDENT && !tombstone;

  return (
    <Box>
      {tombstone || entry.kind !== 'post' ? (
        <Box pt="xs">
          <ThreadTombstone
            uri={entry.uri}
            kind={tombstone ?? 'notFound'}
            compact
            href={tombstoneHref(entry, props.ctx)}
          />
        </Box>
      ) : (
        <ThreadTreePost
          post={entry.post}
          postOrigin={props.ctx.postOrigin}
          fontSize={props.ctx.fontSize}
          isThreadAuthor={entry.post.author.did === props.ctx.rootAuthorDid}
          highlighted={entry.uri === props.ctx.highlightedUri}
          childLine={indent && items.length > 0}
        />
      )}
      {items.length > 0 && (
        <Box pl={indent ? 28 : 0}>
          {items.map((item, i) => (
            <Branch
              key={item.key}
              last={i === items.length - 1}
              indent={indent}
            >
              {item.content}
            </Branch>
          ))}
        </Box>
      )}
    </Box>
  );
}

function RootPost(props: { node: TreeNode; ctx: ThreadRenderContext }) {
  const entry = props.node.entry;
  const tombstone = tombstoneOf(props.node);

  if (tombstone || entry.kind !== 'post') {
    return (
      <Box px="md" pt="md" pb="sm">
        <ThreadTombstone
          uri={entry.uri}
          kind={tombstone ?? 'notFound'}
          href={tombstoneHref(entry, props.ctx)}
        />
      </Box>
    );
  }

  return (
    <ThreadAnchorPost
      post={entry.post}
      postOrigin={props.ctx.postOrigin}
      fontSize={props.ctx.fontSize}
      isThreadAuthor
      highlighted={entry.uri === props.ctx.highlightedUri}
    />
  );
}

/** Root on top, then each reply to it as its own block of nested replies */
export function ThreadTree(props: {
  root: TreeNode;
  /** Replies the author hid, shown as extra top-level blocks */
  extra?: TreeNode[];
  ctx: ThreadRenderContext;
}) {
  const replies = [...props.root.children, ...(props.extra ?? [])];

  return (
    <Box>
      <RootPost node={props.root} ctx={props.ctx} />
      {replies.map((child) => (
        <Box key={child.entry.uri} className={classes.topLevel}>
          <TreeNodeView node={child} depth={1} ctx={props.ctx} />
        </Box>
      ))}
      {props.root.hasMore && (
        <Box className={classes.topLevel}>
          <LoadMore node={props.root} ctx={props.ctx} />
        </Box>
      )}
    </Box>
  );
}

/** Tree order; a reply right under its parent is joined to it by a line */
export function ThreadList(props: {
  items: ListItem[];
  index: ThreadIndex;
  ctx: ThreadRenderContext;
}) {
  const rootUri = props.index.rootUri;
  const hasAvatarColumn = (i: number) =>
    props.items[i] !== undefined &&
    props.items[i].node.entry.uri !== rootUri &&
    !tombstoneOf(props.items[i].node);

  return (
    <Box>
      {props.items.map((item, i) => {
        const entry = item.node.entry;

        if (entry.uri === rootUri) {
          return (
            <Box key={entry.uri}>
              <RootPost node={item.node} ctx={props.ctx} />
              {item.node.hasMore && (
                <Box px="md" pb="sm">
                  <LoadMore node={item.node} ctx={props.ctx} />
                </Box>
              )}
            </Box>
          );
        }

        const tombstone = tombstoneOf(item.node);
        if (tombstone || entry.kind !== 'post') {
          return (
            <Box key={entry.uri} className={classes.post} pt={12} pb="lg">
              <ThreadTombstone
                uri={entry.uri}
                kind={tombstone ?? 'notFound'}
                href={tombstoneHref(entry, props.ctx)}
              />
            </Box>
          );
        }

        const parentLine =
          hasAvatarColumn(i - 1) &&
          props.items[i - 1].node.entry.uri === entry.parentUri;
        const childLine =
          hasAvatarColumn(i + 1) &&
          props.items[i + 1].node.entry.parentUri === entry.uri;

        return (
          <ThreadLinearPost
            key={entry.uri}
            post={entry.post}
            postOrigin={props.ctx.postOrigin}
            fontSize={props.ctx.fontSize}
            isThreadAuthor={entry.post.author.did === props.ctx.rootAuthorDid}
            highlighted={entry.uri === props.ctx.highlightedUri}
            parentLine={parentLine}
            childLine={childLine}
            replyingTo={
              !parentLine && entry.parentUri !== rootUri
                ? item.parentHandle
                : undefined
            }
            footer={<LoadMore node={item.node} ctx={props.ctx} />}
          />
        );
      })}
    </Box>
  );
}

export function ShowHiddenReplies(props: {
  count: number;
  onClick: () => void;
}) {
  return (
    <UnstyledButton className={classes.showMoreRow} onClick={props.onClick}>
      <ThemeIcon size={26} radius="xl" variant="light" color="gray">
        <TbEyeOff size={14} strokeWidth={(1.5 * 24) / 14} />
      </ThemeIcon>
      Show {props.count} hidden {props.count === 1 ? 'reply' : 'replies'}
    </UnstyledButton>
  );
}
