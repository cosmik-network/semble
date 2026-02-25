import { Alert, Text } from '@mantine/core';

interface Props {
  query: string;
  handle?: string;
}

export default function SearchQueryAlert(props: Props) {
  return (
    <Alert
      p={'xs'}
      radius={'lg'}
      color="gray"
      variant="transparent"
      w={'100%'}
      title={
        props.query ? (
          <Text fz={'sm'} fw={500} c={'dimmed'} lineClamp={1}>
            Showing results for{' '}
            <Text fz={'sm'} fw={600} c={'bright'} span>
              "{props.query}"
            </Text>
          </Text>
        ) : (
          <Text fz={'sm'} fw={500} c={'dimmed'} lineClamp={1}>
            Search to get started
          </Text>
        )
      }
    />
  );
}
