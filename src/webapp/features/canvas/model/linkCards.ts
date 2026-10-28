export const LINK_CARD_TYPE = 'link-card';

// Copies of a link count once
export function countLinks(store: Record<string, unknown>): number {
  const urls = new Set<string>();
  for (const record of Object.values(store)) {
    const shape = record as {
      typeName?: string;
      type?: string;
      props?: { url?: string };
    };
    if (
      shape.typeName === 'shape' &&
      shape.type === LINK_CARD_TYPE &&
      shape.props?.url
    ) {
      urls.add(shape.props.url);
    }
  }
  return urls.size;
}
