import { useQuery } from '@tanstack/react-query';
import { linkSearchQuery, type SearchScope } from '../../server/canvasServer';
import { useCanvasServer } from '../canvasServerContext';

export default function useLinkSearch(scope: SearchScope, query: string) {
  const server = useCanvasServer();
  return useQuery(linkSearchQuery(server, scope, query));
}
