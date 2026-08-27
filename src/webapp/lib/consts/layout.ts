const BOTTOM_BAR_HEIGHT = 85;

export const BOTTOM_BAR_FOOTER = {
  height: { base: BOTTOM_BAR_HEIGHT, sm: 0 },
};

export const FLOATING_BOTTOM_OFFSET = {
  base: `calc(${BOTTOM_BAR_HEIGHT}px + var(--mantine-spacing-md))`,
  sm: 'md',
};
