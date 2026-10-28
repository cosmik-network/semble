// Boards shown in the Library sidebar's Canvases section
export const NAV_CANVASES_LIMIT = 5;

export const canvasHref = (id: string) => `/canvas/${id}`;

// Not prefetched: the route mints a new id each time it runs
export const NEW_CANVAS_HREF = '/canvas/new';
