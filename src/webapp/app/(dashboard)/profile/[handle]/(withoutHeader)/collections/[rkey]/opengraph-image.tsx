import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { truncateText } from '@/lib/utils/text';
import { CollectionAccessType } from '@semble/types';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image(props: Props) {
  const { rkey, handle } = await props.params;

  const collection = await getCollectionPageByAtUri({
    recordKey: rkey,
    handle: handle,
  });

  return await OpenGraphCard({
    children: (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {collection.accessType === CollectionAccessType.OPEN && (
              <svg
                stroke="#40c057"
                fill="#40c057"
                stroke-width="0"
                viewBox="0 0 512 512"
                height="30px"
                width="30px"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46.3 364 0 448 0l32 0c17.7 0 32 14.3 32 32zM0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z"></path>
              </svg>
            )}
            <p
              style={{
                fontSize: 35,
                lineHeight: 1.2,
                color:
                  collection.accessType === CollectionAccessType.OPEN
                    ? '#40c057'
                    : '#e803ff',
                margin: 0,
              }}
            >
              Collection
            </p>
          </div>

          {/* collection name */}
          <p
            style={{
              fontSize: 50,
              lineHeight: 1.1,
              display: 'block',
              lineClamp: 2,
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '900',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {collection.name}
          </p>

          {/* collection description */}
          {collection.description && (
            <p
              style={{
                fontSize: 35,
                lineHeight: 1.2,
                color: '#868e96',
                marginTop: 20,
                display: 'block',
                WebkitLineClamp: 1,
                lineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: '900',
                wordBreak: 'break-word',
              }}
            >
              {collection.description}
            </p>
          )}

          {collection.cardCount > 0 && (
            <p
              style={{
                fontSize: 30,
                lineHeight: 1,
                color: '#495057',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: '900',
                wordBreak: 'break-word',
              }}
            >
              {collection.cardCount}{' '}
              {collection.cardCount > 1 ? 'cards' : 'card'}
            </p>
          )}

          {/* Author Info */}
          <div
            style={{
              marginTop: 40,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            {collection.author.avatarUrl && (
              <img
                src={collection.author.avatarUrl}
                width={60}
                height={60}
                alt={`${handle}'s avatar`}
                style={{ borderRadius: '20px' }}
              />
            )}
            <p
              style={{
                color: '#23AFED',
                fontSize: 40,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              @{truncateText(collection.author.handle, 35)}
            </p>
          </div>
        </div>
      </div>
    ),
  });
}
