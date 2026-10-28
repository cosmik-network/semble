export const canvasKeys = {
  all: () => ['canvases'] as const,
  list: (ownerDid: string) => [...canvasKeys.all(), 'list', ownerDid] as const,
  canvas: (id: string) => [...canvasKeys.all(), 'canvas', id] as const,
};
