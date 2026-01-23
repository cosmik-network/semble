import { NextRequest } from 'next/server';
import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { truncateText } from '@/lib/utils/text';
import { getDomain, getUrlFromSlug } from '@/lib/utils/link';
import { getLibrariesForUrl } from '@/features/semble/lib/dal';

export const runtime = 'edge';

interface Metadata {
  title?: string;
  url?: string;
  domain?: string;
  imageUrl?: string;
  libraries?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');

  let metadata: Metadata = {};
  if (url) {
    try {
      const result = await getUrlMetadata(getUrlFromSlug([url]));
      const libraries = await getLibrariesForUrl(getUrlFromSlug([url]));

      metadata = {
        ...(result?.metadata || {}),
        domain: getDomain(url),
        libraries: Number(libraries.pagination.totalCount) || 0,
      };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      metadata = {};
    }
  }

  const imageResponse = await OpenGraphCard({
    children: (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 35,
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
                  fontSize: 64,
                  lineHeight: 1.1,
                  display: 'block',
                  lineClamp: 2,
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {metadata.title || metadata.url || metadata.domain || 'Unknown'}
              </p>

              {/* libraries */}
              {metadata.libraries !== 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginTop: 40,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="45"
                    height="45"
                    stroke="#868e96"
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
                      fontSize: 30,
                      lineHeight: 1,
                      color: '#495057',
                      margin: 0,
                    }}
                  >
                    In {metadata.libraries}{' '}
                    {metadata.libraries && metadata.libraries > 1
                      ? 'libraries'
                      : 'library'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ),
  });

  return imageResponse;
}
