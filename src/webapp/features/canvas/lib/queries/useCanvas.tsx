import { useQuery } from '@tanstack/react-query';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';
import useStorageChanges from './useStorageChanges';

// One board's record, without the list's thumbnails: cheap enough to refetch
// on every save while the board is open
export default function useCanvas(id: string) {
  useStorageChanges();

  return useQuery({
    queryKey: canvasKeys.canvas(id),
    queryFn: () => canvasStorage.getCanvas(id),
  });
}
