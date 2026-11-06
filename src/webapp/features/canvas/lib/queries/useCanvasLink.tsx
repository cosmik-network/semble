import { useQuery } from '@tanstack/react-query';
import { linkQuery } from '../../server/canvasServer';
import { useCanvasServer } from '../canvasServerContext';

// What a link card shows; the controller fetches it, through the same batcher
export default function useCanvasLink(url: string, enabled = true) {
  const server = useCanvasServer();
  return useQuery({ ...linkQuery(server, url), enabled });
}
