import { type Editor } from 'tldraw';
import { collectionFrameOf } from '../model/collectionFrames';

type SvgExport = NonNullable<Awaited<ReturnType<Editor['getSvgElement']>>>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const titled = new WeakSet<Editor>();

export function attachBoardExports(editor: Editor, getTitle: () => string) {
  const getSvgElement = editor.getSvgElement.bind(editor);
  editor.getSvgElement = async (shapes, opts) => {
    const withTitle = titled.has(editor);
    const result = await getSvgElement(
      withSingleFrameShown(editor, shapes),
      opts,
    );
    if (!result || !withTitle) return result;
    const screenWidth = editor.getViewportScreenBounds().w;
    addTitleCard(result, getTitle(), result.width / screenWidth);
    return result;
  };
}

// For a screenshot of the view, which shows the board's name the way the
// header does on screen. tldraw reaches getSvgElement synchronously, so the
// flag only has to cover the call.
export function withExportTitle<T>(editor: Editor, run: () => T): T {
  titled.add(editor);
  try {
    return run();
  } finally {
    titled.delete(editor);
  }
}

// tldraw leaves a frame out of its own export when it's the only shape
// exported, drawing just its children. Repeating the id gets past that check
// without drawing the frame twice, so a collection frame keeps its header.
function withSingleFrameShown(
  editor: Editor,
  shapes: Parameters<Editor['getSvgElement']>[0],
) {
  if (shapes.length !== 1) return shapes;
  const shape =
    typeof shapes[0] === 'string' ? editor.getShape(shapes[0]) : shapes[0];
  return shape && collectionFrameOf(shape) ? [shape.id, shape.id] : shapes;
}

// Measured in screen pixels to match the header card, then scaled by how many
// image pixels a screen pixel became
const CARD = {
  margin: 10,
  height: 42,
  paddingX: 14,
  radius: 13,
  fontSize: 16,
  maxTextWidth: 320,
};
// The image can't load the app's font, so the card is measured and drawn in
// one it has
const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fitText(text: string, maxWidth: number) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return { text, width: maxWidth };
  context.font = `700 ${CARD.fontSize}px ${FONT_FAMILY}`;
  const measure = (value: string) => context.measureText(value).width;
  if (measure(text) <= maxWidth) return { text, width: measure(text) };
  let end = text.length;
  while (end > 1 && measure(`${text.slice(0, end)}…`) > maxWidth) end--;
  const fitted = `${text.slice(0, end).trimEnd()}…`;
  return { text: fitted, width: measure(fitted) };
}

function svgElement(name: string, attributes: Record<string, string | number>) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

// Drawn in the export's page units, over the view's top left corner
function addTitleCard(
  result: SvgExport,
  title: string,
  pixelsPerScreen: number,
) {
  const { svg, width } = result;
  const [minX, minY, viewWidth] = svg
    .getAttribute('viewBox')!
    .split(' ')
    .map(Number);
  const unit = pixelsPerScreen * (viewWidth / width);
  const isDarkMode = svg.dataset.colorMode === 'dark';
  const fitted = fitText(
    title,
    Math.min(
      CARD.maxTextWidth,
      width / pixelsPerScreen - 2 * (CARD.margin + CARD.paddingX),
    ),
  );
  const filterId = `title-card-shadow-${crypto.randomUUID()}`;

  const filter = svgElement('filter', {
    id: filterId,
    x: '-20%',
    y: '-50%',
    width: '140%',
    height: '200%',
  });
  filter.append(
    svgElement('feDropShadow', {
      dx: 0,
      dy: unit,
      stdDeviation: 1.5 * unit,
      'flood-color': '#000',
      'flood-opacity': isDarkMode ? 0.3 : 0.08,
    }),
  );
  const card = svgElement('g', {
    transform: `translate(${minX + CARD.margin * unit} ${minY + CARD.margin * unit}) scale(${unit})`,
  });
  card.append(
    svgElement('rect', {
      width: fitted.width + 2 * CARD.paddingX,
      height: CARD.height,
      rx: CARD.radius,
      fill: isDarkMode ? '#242424' : '#ffffff',
      stroke: isDarkMode ? '#424242' : '#dee2e6',
      'stroke-width': 1,
      filter: `url(#${filterId})`,
    }),
  );
  const text = svgElement('text', {
    x: CARD.paddingX,
    y: CARD.height / 2,
    'dominant-baseline': 'central',
    'font-size': CARD.fontSize,
    'font-weight': 700,
    'font-family': FONT_FAMILY,
    fill: isDarkMode ? '#c9c9c9' : '#000000',
  });
  text.textContent = fitted.text;
  card.append(text);
  svg.append(filter, card);
}
