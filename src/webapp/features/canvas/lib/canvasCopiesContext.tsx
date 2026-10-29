import { createContext, use } from 'react';
import { useValue, type TLShapeId } from 'tldraw';
import type { Copies } from '../controller/copies';

// Null until the board has loaded
const CanvasCopiesContext = createContext<Copies | null>(null);

interface Props {
  copies: Copies | null;
  children: React.ReactNode;
}

export function CanvasCopiesProvider(props: Props) {
  return (
    <CanvasCopiesContext value={props.copies}>
      {props.children}
    </CanvasCopiesContext>
  );
}

// How many copies of the link are on the board, and whether this copy is
// outlined for a hovered sibling
export function useCopyState(id: TLShapeId, url: string) {
  const copies = use(CanvasCopiesContext);
  const count = useValue('copy count', () => copies?.count(url) ?? 0, [
    copies,
    url,
  ]);
  const isOutlined = useValue(
    'copy outlined',
    () => copies?.isOutlined(id) ?? false,
    [copies, id],
  );
  return { count, isOutlined };
}
