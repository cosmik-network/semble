export const DEFAULT_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  // light-dark() resolves per Mantine's color-scheme, so callers don't need
  // to branch on the scheme themselves. Dark: quieter lime fading into black
  // instead of white so the page behind reads as dimmed, not washed out.
  gradient:
    'linear-gradient(0deg, light-dark(rgba(204, 255, 0, 0.5), rgba(204, 255, 0, 0.35)), light-dark(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.1)))',
};

export const DANGER_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  gradient:
    'linear-gradient(0deg, light-dark(rgba(242, 5, 5, 0.5), rgba(242, 5, 5, 0.4)), light-dark(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.1)))',
};

export const UPDATE_OVERLAY_PROPS = {
  inset: 0,
  zIndex: 102,
  blur: 3,
  gradient:
    'linear-gradient(0deg, light-dark(rgba(255, 142, 0, 0.5), rgba(255, 142, 0, 0.4)), light-dark(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.1)))',
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
