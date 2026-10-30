import type { Editor } from 'tldraw';
import type { CountLines } from '../model/linkCards';

// Laid out in tldraw's hidden measuring element, so cards off screen can be
// measured too. Cached, as a card is sized on every change to it.
export function createLineCounter(editor: Editor) {
  const known = new Map<string, Map<string, number>>();

  const count: CountLines = (text, font, width) => {
    const style = `${font.fontSize}/${font.fontWeight}/${font.richText}/${width}`;
    let byText = known.get(style);
    if (!byText) {
      byText = new Map();
      known.set(style, byText);
    }
    let lines = byText.get(text);
    if (lines === undefined) {
      const { h } = editor.textMeasure.measureText(text, {
        fontStyle: 'normal',
        fontWeight: String(font.fontWeight),
        fontSize: font.fontSize,
        lineHeight: font.lineHeight,
        maxWidth: width,
        padding: '0px',
        // The font the cards inherit
        fontFamily: 'inherit',
        disableOverflowWrapBreaking: !font.richText,
        otherStyles: font.richText
          ? { 'overflow-wrap': 'anywhere' }
          : { 'white-space': 'normal' },
      });
      lines = Math.round(h / (font.fontSize * font.lineHeight));
      byText.set(text, lines);
    }
    return lines;
  };

  return {
    count,
    // Once a font loads, text measured before it may wrap differently
    forget: () => known.clear(),
  };
}
