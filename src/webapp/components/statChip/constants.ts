// Plain module so server components can import these without pulling in the
// client-only StatChip (a client module's exports become references on the
// server, not values).
export const STAT_CHIP_AVATAR_SIZE = 26;
export const STAT_CHIP_PREVIEW_LIMIT = 3;
