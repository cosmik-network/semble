import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';
import useStorageChanges from './useStorageChanges';

// The signed-in user's boards, most recently edited first. Boards live in the
// browser, so this stays pending during server rendering.
export default function useCanvases() {
  const { user } = useAuth();
  useStorageChanges();

  return useQuery({
    queryKey: canvasKeys.list(user?.id ?? ''),
    queryFn: () => canvasStorage.listCanvases(user!.id),
    enabled: !!user,
  });
}
