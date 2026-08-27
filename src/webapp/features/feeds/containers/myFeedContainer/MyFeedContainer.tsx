'use client';

import { Suspense } from 'react';
import { Button, Card, Container, Group, Stack, Text } from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';
import { LinkButton, LinkText } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';
import { ActivitySource, ActivityType, UrlType } from '@semble/types';
import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import useFollowingFeed from '@/features/feeds/lib/queries/useFollowingFeed';
import useBskyFollowingFeed from '@/features/feeds/lib/queries/useBskyFollowingFeed';
import { useSettings } from '@/providers/settings';
import { useAuth } from '@/hooks/useAuth';
import { feedViewRequiresAuth } from '@/features/feeds/lib/feedOptions';
import { hasFeedFilters } from '@/features/feeds/lib/feedEmptyState';
import FeedLoginCta from '@/features/feeds/components/feedLoginCta/FeedLoginCta';
import FeedList from './FeedList';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import { BiRightArrowAlt } from 'react-icons/bi';

/** The filter arguments every feed query takes. */
interface FeedFilters {
  urlType?: UrlType;
  source?: ActivitySource;
  activityTypes?: ActivityType[];
  includeKnownBots: boolean;
}

interface ViewProps {
  filters: FeedFilters;
  hasFilters: boolean;
  onClearFilters: () => void;
}

/*
 * One component per view, each mounting only its own query: react-query omits
 * `enabled` from `UseSuspenseInfiniteQueryOptions`, so a suspense query cannot
 * be held back once its component has called it. A single component calling
 * all three would request — and suspend on — the global feed while showing one
 * of the other two.
 */
function GlobalFeed(props: ViewProps) {
  const query = useGlobalFeed(props.filters);

  return (
    <FeedList
      query={query}
      view="global"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

function FollowingFeed(props: ViewProps) {
  const query = useFollowingFeed(props.filters);

  return (
    <FeedList
      query={query}
      view="following"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

function BskyFollowingFeed(props: ViewProps & { identifier?: string }) {
  const query = useBskyFollowingFeed({
    ...props.filters,
    identifier: props.identifier,
  });

  return (
    <FeedList
      query={query}
      view="bskyFollowing"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

/**
 * Whose follows a guest is reading, and the way back to the prompt — without
 * it a mistyped handle would sit in settings with nothing to undo it.
 */
function GuestBskyHandleBar(props: { handle: string; onChange: () => void }) {
  const loginHref = useLoginHref();

  return (
    <Container p="xs" pb={0} size="xl">
      {/* A band rather than a line of text: it says which feed this is, and
          reads as a header for the column below it instead of as the first
          item in it. */}
      <Card
        radius="lg"
        p={'sm'}
        maw={600}
        mx="auto"
        w="100%"
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
      >
        <Stack gap="sm">
          <Group gap={'xs'} wrap="nowrap" miw={0}>
            <FaBluesky size={16} color="#0085ff" style={{ flexShrink: 0 }} />
            <Text fz="sm" fw={500} c="dimmed">
              {'Saves from people '}
              <LinkText
                span
                href={`/profile/${props.handle}`}
                fw={600}
                c="bright"
              >
                @{props.handle}
              </LinkText>
              {' follows on Bluesky'}
            </Text>
          </Group>
          {/* Their own row: sharing one with the sentence left it a few
              characters wide on a phone. */}
          <Group gap={'xs'} wrap="nowrap" justify="flex-start">
            {/* The reason, not the act: a guest reading this feed can already
                see it, so "log in" on its own asks for something and offers
                nothing back. Keeping the cards is what an account is for. */}
            <LinkButton
              href={loginHref}
              size="sm"
              radius="xl"
              color="var(--mantine-color-dark-filled)"
              rightSection={<BiRightArrowAlt size={22} />}
            >
              Log in to keep these
            </LinkButton>
            <Button
              variant="default"
              size="sm"
              radius="xl"
              onClick={props.onChange}
            >
              Change
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}

export default function MyFeedContainer() {
  const { settings, updateSetting, updateSettings, isHydrated } = useSettings();
  const { isAuthenticated } = useAuth();

  // Until localStorage has been read, `settings` still holds the defaults, and
  // mounting a feed now would request the wrong one — see the note above on why
  // a suspense query cannot be held back once mounted. Only a hard load of this
  // page reaches that state: `useSettings` reads the app-wide provider, which
  // has already hydrated by the time anything navigates here from inside.
  if (!isHydrated) return <MyFeedContainerSkeleton />;

  const filters: FeedFilters = {
    urlType: settings.feedUrlType ?? undefined,
    source: settings.feedSource ?? undefined,
    activityTypes: settings.feedActivityType
      ? [settings.feedActivityType]
      : undefined,
    includeKnownBots: settings.includeKnownBots,
  };

  const viewProps: ViewProps = {
    filters,
    hasFilters: hasFeedFilters(settings),
    onClearFilters: () =>
      updateSettings({
        feedUrlType: null,
        feedSource: null,
        feedActivityType: null,
      }),
  };

  // `Dashboard` holds the whole tree behind a skeleton until the session
  // resolves, so `isAuthenticated` is settled by the time this mounts.
  const view = settings.feedView;

  // `following` is answered off the session and can only 401 for a guest, so
  // the CTA stands in for it. The Bluesky view is answered for whichever
  // account is named, so once a guest has told us their handle it is a real
  // feed — until then the CTA is what asks for it.
  if (feedViewRequiresAuth(view) && !isAuthenticated) {
    if (view !== 'bskyFollowing' || !settings.bskyHandle) {
      return <FeedLoginCta view={view} />;
    }

    return (
      <Suspense fallback={<MyFeedContainerSkeleton />}>
        <GuestBskyHandleBar
          handle={settings.bskyHandle}
          onChange={() => updateSetting('bskyHandle', null)}
        />
        <BskyFollowingFeed {...viewProps} identifier={settings.bskyHandle} />
      </Suspense>
    );
  }

  // The suspense `useGlobalFeed` throws would otherwise bubble past this
  // container to the nearest ancestor boundary, blanking the page during a
  // client-side transition from explore.
  return (
    <Suspense fallback={<MyFeedContainerSkeleton />}>
      {view === 'following' ? (
        <FollowingFeed {...viewProps} />
      ) : view === 'bskyFollowing' ? (
        <BskyFollowingFeed {...viewProps} />
      ) : (
        <GlobalFeed {...viewProps} />
      )}
    </Suspense>
  );
}
