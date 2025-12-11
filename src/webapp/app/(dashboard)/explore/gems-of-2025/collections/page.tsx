import GemsCollectionsContainer from '@/features/collections/containers/gemsCollectionsContainer/GemsCollectionsContainer';
import GemsOfYearBanner from '@/features/collections/components/gemsOfYearBanner/GemsOfYearBanner';

export default function Page() {
  return (
    <>
      <GemsOfYearBanner />
      <GemsCollectionsContainer />
    </>
  );
}
