// Browser APIs tldraw's Editor touches that jsdom lacks. jsdom has no layout,
// so text measures as zero size.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () =>
    [new DOMRect()] as unknown as DOMRectList;
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
