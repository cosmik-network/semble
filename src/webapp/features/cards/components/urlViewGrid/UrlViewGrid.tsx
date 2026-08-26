'use client';

import { Divider, Grid } from '@mantine/core';
import { Fragment } from 'react';
import type { UrlView } from '@semble/types';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useNavbarContext } from '@/providers/navbar';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';

interface Props {
  urls: UrlView[];
  analyticsContext: CardSaveAnalyticsContext;
}

/** Same responsive recipe as CardsContainerContent, over UrlViews. */
export default function UrlViewGrid(props: Props) {
  const { settings } = useUserSettings();
  const { desktopOpened } = useNavbarContext();

  const isGrid = settings.cardView === 'grid';

  return (
    <Grid gap={settings.cardView === 'list' ? 0 : 'xs'}>
      {props.urls.map((urlView, index) => (
        <Fragment key={urlView.url}>
          {settings.cardView === 'list' && index > 0 && (
            <Grid.Col span={12}>
              <Divider />
            </Grid.Col>
          )}
          <Grid.Col
            span={{
              base: 12,
              xs: !isGrid ? 12 : desktopOpened ? 12 : 6,
              sm: !isGrid ? 12 : desktopOpened ? 6 : 4,
              md: !isGrid ? 12 : 4,
              lg: !isGrid ? 12 : 3,
            }}
            // let the browser skip offscreen rows
            style={{
              contentVisibility: 'auto',
              containIntrinsicSize: 'auto 300px',
            }}
          >
            <SimilarUrlCard
              urlView={urlView}
              analyticsContext={props.analyticsContext}
            />
          </Grid.Col>
        </Fragment>
      ))}
    </Grid>
  );
}
