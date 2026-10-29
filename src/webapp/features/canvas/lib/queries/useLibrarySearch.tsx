import { useQuery } from '@tanstack/react-query';
import { librarySearchQuery } from '../../server/canvasServer';
import { useCanvasServer } from '../canvasServerContext';

export default function useLibrarySearch(query: string) {
  const server = useCanvasServer();
  return useQuery(librarySearchQuery(server, query));
}
