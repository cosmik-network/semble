import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { truncateText } from '@/lib/utils/text';

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
          <p
            style={{
              fontSize: 40,
              lineHeight: 1.2,
              color: '#e803ff',
              margin: 0,
            }}
          >
            Collection
          </p>

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
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: '900',
                wordBreak: 'break-word',
              }}
            >
              {collection.description}
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
