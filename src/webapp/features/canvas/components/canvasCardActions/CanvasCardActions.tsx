'use client';

import { ActionIcon, Menu } from '@mantine/core';
import { Fragment, useState } from 'react';
import {
  BsFiles,
  BsPencilFill,
  BsThreeDots,
  BsTrash2Fill,
} from 'react-icons/bs';
import type { CanvasSummary } from '../../storage/canvasStorage';
import useDuplicateCanvas from '../../lib/mutations/useDuplicateCanvas';
import { showCanvasError } from '../../lib/showCanvasError';
import RenameCanvasModal from '../renameCanvasModal/RenameCanvasModal';
import DeleteCanvasModal from '../deleteCanvasModal/DeleteCanvasModal';

interface Props {
  canvas: CanvasSummary;
}

export default function CanvasCardActions(props: Props) {
  const duplicateCanvas = useDuplicateCanvas();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <Fragment>
      <Menu shadow="sm">
        <Menu.Target>
          <ActionIcon
            variant="light"
            color={'gray'}
            radius={'xl'}
            aria-label="Canvas options"
          >
            <BsThreeDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<BsPencilFill />}
            onClick={() => setShowRenameModal(true)}
          >
            Rename canvas
          </Menu.Item>
          <Menu.Item
            leftSection={<BsFiles />}
            onClick={() =>
              duplicateCanvas.mutate(props.canvas.id, {
                onError: () => showCanvasError('Could not duplicate canvas'),
              })
            }
          >
            Duplicate canvas
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<BsTrash2Fill />}
            onClick={() => setShowDeleteModal(true)}
          >
            Delete canvas
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <RenameCanvasModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        canvasId={props.canvas.id}
        name={props.canvas.name}
      />
      <DeleteCanvasModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        canvasId={props.canvas.id}
        name={props.canvas.name}
      />
    </Fragment>
  );
}
