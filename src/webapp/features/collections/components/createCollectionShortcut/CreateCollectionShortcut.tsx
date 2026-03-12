import { ActionIcon, Button, NavLink } from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';

export default function CreateCollectionShortcut() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <Fragment>
      <ActionIcon
        variant="light"
        radius={'xl'}
        color="blue"
        onClick={() => setIsDrawerOpen(true)}
      >
        <FiPlus size={18} />
      </ActionIcon>
      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </Fragment>
  );
}
