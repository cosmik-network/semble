// Geometric shapes, lines, highlighter, laser and media are left out on purpose
export const BOARD_TOOLS = [
  'select',
  'hand',
  'arrow',
  'frame',
  'text',
  'note',
  'draw',
  'eraser',
] as const;

export type BoardTool = (typeof BOARD_TOOLS)[number];

// No toolbar button, but keeps its keyboard shortcut
const HIDDEN_TOOLS = ['zoom'];

export function isBoardTool(toolId: string): boolean {
  return (
    (BOARD_TOOLS as readonly string[]).includes(toolId) ||
    HIDDEN_TOOLS.includes(toolId)
  );
}
