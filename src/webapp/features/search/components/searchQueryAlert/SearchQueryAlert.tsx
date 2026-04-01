import { Alert, Text } from '@mantine/core';

interface Props {
  query: string;
  count?: number;
  handle?: string;
}

export default function SearchQueryAlert(props: Props) {
  return (
    <Alert
      p={0}
      radius={'lg'}
      variant="transparent"
      color="gray"
      w={'100%'}
      title={
        props.query ? (
          <Text fz={'sm'} fw={500} c={'dimmed'} lineClamp={1}>
            {props.count} result{props.count && props.count > 1 ? 's' : ''} for{' '}
            <Text fz={'sm'} fw={600} c={'bright'} span>
              {props.query}
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
