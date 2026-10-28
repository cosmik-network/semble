import { DefaultToolbar, ToolbarItem, useReadonly } from 'tldraw';
import { BOARD_TOOLS, READONLY_BOARD_TOOLS } from '../../model/boardTools';

export default function BoardToolbar() {
  const isReadonly = useReadonly();
  const tools = isReadonly ? READONLY_BOARD_TOOLS : BOARD_TOOLS;

  return (
    <DefaultToolbar>
      {tools.map((tool) => (
        <ToolbarItem key={tool} tool={tool} />
      ))}
    </DefaultToolbar>
  );
}
