import GemsFeedContainer from '@/features/feeds/containers/gemsFeedContainer/GemsFeedContainer';
import GemsOfYearBanner from '@/features/collections/components/gemsOfYearBanner/GemsOfYearBanner';

export default function Page() {
  return (
    <>
      <GemsOfYearBanner />
      <GemsFeedContainer />
    </>
  );
}
