import MyFeedContainer from '@/features/feeds/containers/myFeedContainer/MyFeedContainer';
import HomeOnboardingBanner from '@/features/onboarding/components/homeOnboardingBanner/HomeOnboardingBanner';
import { getSession } from '@/lib/auth/dal.server';
import { Box, Container } from '@mantine/core';
import { Fragment, Suspense } from 'react';
import styles from './home.module.css';

export default async function Page() {
  const user = await getSession();

  return (
    <Fragment>
      {user && (
        <Suspense fallback={null}>
          {/* Aligned with the feed column inside MyFeedContainer (maw 600, centered) */}
          <Container px="xs" size="xl">
            <Box
              maw={600}
              mx="auto"
              w="100%"
              mb="lg"
              className={styles.bannerSlot}
            >
              <HomeOnboardingBanner />
            </Box>
          </Container>
        </Suspense>
      )}
      <MyFeedContainer />
    </Fragment>
  );
}
