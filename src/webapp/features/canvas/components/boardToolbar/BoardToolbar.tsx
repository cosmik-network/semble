import { DefaultToolbar, ToolbarItem } from 'tldraw';
import { BOARD_TOOLS } from '../../model/boardTools';

export default function BoardToolbar() {
  return (
    <DefaultToolbar>
      {BOARD_TOOLS.map((tool) => (
        <ToolbarItem key={tool} tool={tool} />
      ))}
    </DefaultToolbar>
  );
}
