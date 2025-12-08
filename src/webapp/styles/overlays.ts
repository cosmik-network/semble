export const DEFAULT_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  gradient:
    'linear-gradient(0deg, rgba(204, 255, 0, 0.5), rgba(255, 255, 255, 0.5))',
};

export const DANGER_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  gradient:
    'linear-gradient(0deg, rgba(242, 5, 5, 0.5), rgba(255, 255, 255, 0.5))',
};

export const UPDATE_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  gradient:
    'linear-gradient(0deg, rgba(255, 142, 0, 0.5), rgba(255, 255, 255, 0.5))',
};

export const IMAGE_FADE_OVERLAY = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  right: 0,
  height: '50px',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--mantine-color-body) 100%)',
};
