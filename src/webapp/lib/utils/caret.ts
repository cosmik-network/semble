export interface CaretCoordinates {
  /** Px from the textarea's border-box top (scroll offset not subtracted). */
  top: number;
  /** Px from the textarea's border-box left (scroll offset not subtracted). */
  left: number;
  /** Line height at the caret. */
  height: number;
}

// Styles that affect text layout inside a textarea; copied onto the mirror
// so its line wrapping matches the real element exactly.
const MIRRORED_PROPERTIES = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontStretch',
  'fontVariant',
  'letterSpacing',
  'wordSpacing',
  'textIndent',
  'textTransform',
  'lineHeight',
  'tabSize',
  'textAlign',
] as const;

let mirror: HTMLDivElement | null = null;

/**
 * Measures the pixel position of a character index inside a textarea using
 * the mirror-div technique: a hidden div with the same text styles wraps
 * identically, so a marker span at `index` lands where the caret would.
 */
export function getCaretCoordinates(
  el: HTMLTextAreaElement,
  index: number,
): CaretCoordinates {
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mirror);
  }

  const computed = window.getComputedStyle(el);
  const style = mirror.style;
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.overflow = 'hidden';
  for (const prop of MIRRORED_PROPERTIES) {
    style[prop] = computed[prop];
  }

  mirror.textContent = el.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = el.value.charAt(index) || '.';
  mirror.appendChild(marker);

  const lineHeight = parseFloat(computed.lineHeight);
  const height = Number.isNaN(lineHeight)
    ? parseFloat(computed.fontSize) * 1.2
    : lineHeight;

  return {
    top: marker.offsetTop + parseFloat(computed.borderTopWidth),
    left: marker.offsetLeft + parseFloat(computed.borderLeftWidth),
    height,
  };
}
