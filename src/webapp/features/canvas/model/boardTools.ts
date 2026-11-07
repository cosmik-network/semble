// tldraw's geo tool ids, one per shape. Past the first few toolbar items they
// go in the toolbar's overflow menu.
const GEO_TOOLS = [
  'rectangle',
  'ellipse',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'octagon',
  'star',
  'rhombus',
  'rhombus-2',
  'oval',
  'trapezoid',
  'arrow-right',
  'arrow-left',
  'arrow-up',
  'arrow-down',
  'x-box',
  'check-box',
  'heart',
  'cloud',
] as const;

// Lines, highlighter, laser and media are left out on purpose
export const BOARD_TOOLS = [
  'select',
  'hand',
  'arrow',
  'frame',
  'text',
  'note',
  'draw',
  'eraser',
  ...GEO_TOOLS,
] as const;

// tldraw's toolbar shows this many items on wide screens, the rest behind an
// overflow button
export const TOOLBAR_VISIBLE_TOOLS = 8;

export type BoardTool = (typeof BOARD_TOOLS)[number];

// What a tab that doesn't write the board can still use
export const READONLY_BOARD_TOOLS: readonly BoardTool[] = ['select', 'hand'];

// No toolbar button, but keeps its keyboard shortcut
const HIDDEN_TOOLS = ['zoom'];

export function isBoardTool(toolId: string): boolean {
  return (
    (BOARD_TOOLS as readonly string[]).includes(toolId) ||
    HIDDEN_TOOLS.includes(toolId)
  );
}
