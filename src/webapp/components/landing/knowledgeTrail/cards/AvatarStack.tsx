import { Avatar, AvatarGroup, Group } from '@mantine/core';
import { interestAvatars } from '../mockData';

/**
 * Decorative stack of overlapping avatars for the "See who shares your
 * interest" trail stop. Wrapped in a centered Group so it sits centered in the
 * (center-aligned) stop slot.
 */
export default function AvatarStack() {
  return (
    <Group justify="center">
      <AvatarGroup spacing="md">
        {interestAvatars.map((a) => (
          <Avatar
            key={a.initial}
            variant="filled"
            color={a.color}
            size="lg"
            radius="lg"
          >
            {a.initial}
          </Avatar>
        ))}
      </AvatarGroup>
    </Group>
  );
}
