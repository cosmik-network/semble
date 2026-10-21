import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import type { Editor, TLShapeId } from 'tldraw';
import useUpdateCollection from '@/features/collections/lib/mutations/useUpdateCollection';
import { getMyProfile } from '@/features/profile/lib/dal';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { COLLECTION_TYPE } from '../const';
import type { CollectionShape } from '../shapes/collectionShape/CollectionShapeUtil';
import { serverWrite } from './arrows';
import { useCanvasSession } from './canvasSession';
import { isCollectionShape, resolveCollectionRkey } from './frames';

export function useIsMyCollection(shape: CollectionShape | null) {
  const profile = useQuery({
    queryKey: profileKeys.mine(),
    queryFn: () => getMyProfile(),
  });
  return (
    !!shape &&
    !!profile.data &&
    shape.props.authorHandle === profile.data.handle
  );
}

export function useRenameCollection(editor: Editor) {
  const updateCollection = useUpdateCollection();
  const session = useCanvasSession();

  return async (id: TLShapeId, name: string) => {
    const shape = editor.getShape(id);
    const trimmed = name.trim();
    if (!isCollectionShape(shape) || !trimmed) return;
    const previous = shape.props.name;
    if (trimmed === previous) return;

    const setName = (value: string) =>
      serverWrite(editor, () => {
        if (!editor.getShape(id)) return;
        editor.updateShape<CollectionShape>({
          id,
          type: COLLECTION_TYPE,
          props: { name: value },
        });
      });

    setName(trimmed);
    try {
      await session.track(
        shape.props.collectionId,
        resolveCollectionRkey(editor, id).then((rkey) =>
          updateCollection.mutateAsync({
            collectionId: shape.props.collectionId,
            rkey,
            name: trimmed,
            description: shape.props.description || undefined,
            accessType: shape.props.accessType,
          }),
        ),
      );
    } catch {
      setName(previous);
      notifications.show({
        message: 'Could not rename the collection.',
        position: 'top-center',
      });
    }
  };
}
