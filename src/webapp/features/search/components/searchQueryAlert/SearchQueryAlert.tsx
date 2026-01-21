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
      w={'100%'}
      title={
        <Text fz={'sm'} fw={500} c={'dimmed'} lineClamp={1}>
          Showing results for{' '}
          <Text fz={'sm'} fw={600} c={'bright'} span>
            "{props.query}"
          </Text>
        </Text>
      }
    />
  );
}
