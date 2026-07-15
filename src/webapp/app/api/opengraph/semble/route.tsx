import { NextRequest } from 'next/server';
import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import {
  fetchImageAsDataUri,
  getFaviconUrl,
  normalizeEmbedImageUrl,
} from '@/features/openGraph/lib/utils/collage';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';
import { getDomain, getUrlFromSlug } from '@/lib/utils/link';

// Node runtime is required: fetchImageAsDataUri uses Buffer to base64-encode
// the pre-fetched thumbnail. Do not switch to 'edge'.
export const runtime = 'nodejs';

const THUMB_SIZE = 225;

interface Metadata {
  title?: string;
  url?: string;
  domain?: string;
  imageUrl?: string;
  libraries?: number;
  collections?: number;
  connections?: number;
  notes?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');

  let metadata: Metadata = {};
  if (url) {
    try {
      const result = await getUrlMetadata({
        url: getUrlFromSlug([url]),
        includeStats: true,
      });

      const stats = result?.stats;

      metadata = {
        ...(result?.metadata || {}),
        domain: getDomain(url),
        libraries: stats?.libraryCount ?? 0,
        collections: stats?.collectionCount ?? 0,
        connections: stats?.connections?.all?.total ?? 0,
        notes: stats?.noteCount ?? 0,
      };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      metadata = {};
    }
  }

  const hasStats =
    metadata.libraries !== undefined ||
    metadata.collections !== undefined ||
    metadata.connections !== undefined ||
    metadata.notes !== undefined;

  // Thumbnail fallback chain, mirroring UrlCard: embed image -> favicon.
  // Pre-fetched as a data URI so a broken image can't break the whole render.
  let thumb: { kind: 'image' | 'favicon'; dataUri: string } | null = null;
  if (url) {
    if (metadata.imageUrl) {
      const dataUri = await fetchImageAsDataUri(
        normalizeEmbedImageUrl(metadata.imageUrl),
      );
      if (dataUri) thumb = { kind: 'image', dataUri };
    }
    if (!thumb) {
      const dataUri = await fetchImageAsDataUri(
        getFaviconUrl(metadata.domain || getDomain(url)),
      );
      if (dataUri) thumb = { kind: 'favicon', dataUri };
    }
  }

  const imageResponse = await OpenGraphCard({
    children: (
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 10,
          }}
        >
          {metadata && url && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* domain */}
              <p
                style={{
                  fontSize: 40,
                  lineHeight: 1.2,
                  color: '#23AFED',
                  margin: 0,
                }}
              >
                {truncateText(metadata.domain || getDomain(url), 35)}
              </p>

              {/* title */}
              <p
                style={{
                  fontSize: 50,
                  lineHeight: 1.1,
                  display: 'block', // needed for line clamp
                  lineClamp: 2,
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '900',
                  wordBreak: 'normal', // prevent breaking mid-word
                  overflowWrap: 'normal', // prevent wrapping mid-word
                  margin: 0,
                }}
              >
                {metadata.title || metadata.url || metadata.domain || 'Unknown'}
              </p>

              {/* stats row */}
              {hasStats && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 40,
                    marginTop: 40,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* libraries */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* LuLibrary icon */}
                    <svg
                      viewBox="0 0 24 24"
                      width="36"
                      height="36"
                      stroke="#15aabf"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="m16 6 4 14" />
                      <path d="M12 6v14" />
                      <path d="M8 8v12" />
                      <path d="M4 4v16" />
                    </svg>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#495057',
                        margin: 0,
                      }}
                    >
                      {abbreviateNumber(metadata.libraries ?? 0)}
                    </p>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#868e96',
                        margin: 0,
                      }}
                    >
                      {metadata.libraries === 1 ? 'save' : 'saves'}
                    </p>
                  </div>

                  {/* collections */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* BiCollection icon */}
                    <svg
                      viewBox="0 0 24 24"
                      width="36"
                      height="36"
                      fill="#15aabf"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M19 10H5c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2zM5 20v-8h14l.002 8H5zM5 6h14v2H5zm2-4h10v2H7z" />
                    </svg>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#495057',
                        margin: 0,
                      }}
                    >
                      {abbreviateNumber(metadata.collections ?? 0)}
                    </p>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#868e96',
                        margin: 0,
                      }}
                    >
                      {metadata.collections === 1
                        ? 'collection'
                        : 'collections'}
                    </p>
                  </div>

                  {/* connections */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* BiLink icon */}
                    <svg
                      viewBox="0 0 24 24"
                      width="36"
                      height="36"
                      fill="#15aabf"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M8.465 11.293c1.133-1.133 3.109-1.133 4.242 0l.707.707 1.414-1.414-.707-.707c-.943-.944-2.199-1.465-3.535-1.465s-2.592.521-3.535 1.465L4.929 12a5.008 5.008 0 0 0 0 7.071 4.983 4.983 0 0 0 3.535 1.462A4.982 4.982 0 0 0 12 19.071l.707-.707-1.414-1.414-.707.707a3.007 3.007 0 0 1-4.243 0 3.005 3.005 0 0 1 0-4.243l2.122-2.121z" />
                      <path d="m12 4.929-.707.707 1.414 1.414.707-.707a3.007 3.007 0 0 1 4.243 0 3.005 3.005 0 0 1 0 4.243l-2.122 2.121c-1.133 1.133-3.109 1.133-4.242 0L10.586 12l-1.414 1.414.707.707c.943.944 2.199 1.465 3.535 1.465s2.592-.521 3.535-1.465L19.071 12a5.008 5.008 0 0 0 0-7.071 5.006 5.006 0 0 0-7.071 0z" />
                    </svg>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#495057',
                        margin: 0,
                      }}
                    >
                      {abbreviateNumber(metadata.connections ?? 0)}
                    </p>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#868e96',
                        margin: 0,
                      }}
                    >
                      {metadata.connections === 1
                        ? 'connection'
                        : 'connections'}
                    </p>
                  </div>

                  {/* notes */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* MdOutlineStickyNote2 icon */}
                    <svg
                      viewBox="0 0 24 24"
                      width="36"
                      height="36"
                      fill="#15aabf"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M19 5v9h-5v5H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10l6-6V5c0-1.1-.9-2-2-2zm-7 11H7v-2h5v2zm5-4H7V8h10v2z" />
                    </svg>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#495057',
                        margin: 0,
                      }}
                    >
                      {abbreviateNumber(metadata.notes ?? 0)}
                    </p>
                    <p
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        color: '#868e96',
                        margin: 0,
                      }}
                    >
                      {metadata.notes === 1 ? 'note' : 'notes'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* thumbnail, top-aligned with the metadata like UrlCard */}
        {thumb &&
          (thumb.kind === 'image' ? (
            <img
              src={thumb.dataUri}
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                objectFit: 'cover',
                borderRadius: 24,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f3f5',
                borderRadius: 24,
              }}
            >
              <img src={thumb.dataUri} width={96} height={96} />
            </div>
          ))}
      </div>
    ),
  });

  return imageResponse;
}
