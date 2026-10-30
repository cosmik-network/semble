// How much a link card shows for its size on screen. Every card is the same
// width, so one level serves the whole board. Outline, position and colour
// never change; only what's inside drops out.
// - full: everything
// - title: the title alone, once the description is too small to read
// - bar: a bar where the title was, once that's too small too
export type DetailLevel = 'full' | 'title' | 'bar';

// The card's description and title, in px at their normal size
const DESCRIPTION_PX = 14;
const TITLE_PX = 16;

// On-screen text sizes, in px, where a level drops out and comes back. The gap
// between them keeps a zoom that hovers near one from flickering.
const DESCRIPTION_DROPS = 3.05;
const DESCRIPTION_RETURNS = 3.5;
const TITLE_DROPS = 1.55;
const TITLE_RETURNS = 1.9;

const RANK: Record<DetailLevel, number> = { full: 2, title: 1, bar: 0 };

export function nextDetailLevel(
  previous: DetailLevel,
  zoom: number,
): DetailLevel {
  const description = DESCRIPTION_PX * zoom;
  const title = TITLE_PX * zoom;
  const fits = (level: DetailLevel) => {
    // Coming back up needs more room than staying
    const rising = RANK[level] > RANK[previous];
    if (level === 'full') {
      return description >= (rising ? DESCRIPTION_RETURNS : DESCRIPTION_DROPS);
    }
    if (level === 'title') {
      return title >= (rising ? TITLE_RETURNS : TITLE_DROPS);
    }
    return true;
  };
  if (fits('full')) return 'full';
  if (fits('title')) return 'title';
  return 'bar';
}
