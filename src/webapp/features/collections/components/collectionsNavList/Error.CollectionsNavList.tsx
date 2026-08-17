import { Alert, Text } from '@mantine/core';

export function CollectionNavSectionError() {
  return (
    <Text fz={'sm'} c={'red'} px={'sm'} py={'xxs'}>
      Could not load collections
    </Text>
  );
}

export default function CollectionsNavListError() {
  return <Alert color="red" title="Could not load collections" />;
}
