'use client';

import { useSvgExportContext } from 'tldraw';

// tldraw inlines each element's computed styles into an export, skipping
// -webkit- properties and writing Chrome's computed display (flow-root) over
// -webkit-box, so Mantine's line clamp is lost and text is cut mid-line. A
// stylesheet inside the shape's markup restores it over those inline styles.
const LINE_CLAMP_CSS = `[data-line-clamp] {
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: var(--text-line-clamp, var(--title-line-clamp)) !important;
}`;

export default function ExportLineClamp() {
  const exporting = !!useSvgExportContext();
  if (!exporting) return null;
  return <style>{LINE_CLAMP_CSS}</style>;
}
