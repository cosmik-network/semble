import { Alert, Text } from '@mantine/core';

interface Props {
  query: string;
}

export default function SearchQueryAlert(props: Props) {
  return (
    <Alert
      p={'xs'}
      radius={'lg'}
      color="gray"
      title={
        <Text fz={'sm'} fw={500} c={'dimmed'}>
          Showing results for{' '}
          <Text fz={'sm'} fw={600} c={'bright'} span>
            "{props.query}"
          </Text>
        </Text>
      }
    />
  );
}
