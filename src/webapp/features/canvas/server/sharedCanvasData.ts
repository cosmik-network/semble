import { createSembleClient } from '@/services/client.apiClient';

// What the share page and its Open Graph image both need: the board's record,
// its owner's profile, and its thumbnail. Every call is through public routes,
// so this works with no session. A failed profile or thumbnail fetch degrades
// rather than failing the page.
export async function loadSharedCanvas(shareToken: string) {
  const client = createSembleClient();
  const { record } = await client.canvas.openShared(shareToken);

  const [author, thumbnail] = await Promise.all([
    client
      .getProfile({ identifier: record.ownerDid })
      .catch((error: unknown) => {
        console.warn(error);
        return null;
      }),
    record.hasThumbnail
      ? client.canvas.getSharedThumbnail(shareToken).catch((error: unknown) => {
          console.warn(error);
          return null;
        })
      : null,
  ]);

  return { record, author, thumbnail };
}
