'use client';

import { Button } from '@mantine/core';
import { upperFirst } from '@mantine/hooks';
import { BsFillGridFill, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

export default function CardViewToggle() {
  const { settings, updateSetting } = useUserSettings();

  const isGrid = settings.cardView === 'grid';

  return (
    <Button
      variant="light"
      color="gray"
      leftSection={isGrid ? <BsFillGridFill /> : <BsListTask />}
      onClick={() => updateSetting('cardView', isGrid ? 'list' : 'grid')}
    >
      {upperFirst(settings.cardView)}
    </Button>
  );
}
