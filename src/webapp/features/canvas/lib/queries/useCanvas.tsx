import { useQuery } from '@tanstack/react-query';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';
import useStorageChanges from './useStorageChanges';

// One board's record, without the list's thumbnails: cheap enough to refetch
// on every save while the board is open. Polled so renames and edits from
// other devices show (the board itself adopts new documents separately, in
// the synced storage's poll).
export default function useCanvas(id: string) {
  useStorageChanges();

  return useQuery({
    queryKey: canvasKeys.canvas(id),
    queryFn: () => canvasStorage.getCanvas(id),
    refetchInterval: 30_000,
  });
}
