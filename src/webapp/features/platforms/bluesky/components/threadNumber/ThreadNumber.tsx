import { Badge } from '@mantine/core';

/** Position in the author's self-thread, like 2/5 */
export default function ThreadNumber(props: { value?: string }) {
  if (!props.value) return null;
  return (
    <Badge
      variant="light"
      color="gray"
      radius="xl"
      size="md"
      tt="none"
      fw={600}
      flex="none"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {props.value}
    </Badge>
  );
}
