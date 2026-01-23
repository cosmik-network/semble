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
          <p
            style={{
              fontSize: '40px',
              lineHeight: '20%',
              color: '#e803ff',
            }}
          >
            Collection
          </p>
          <p
            style={{
              fontSize: '64px',
              lineHeight: '100%',
              lineClamp: 2,
              display: 'block',
              maxWidth: '85%',
              wordBreak: 'break-word',
            }}
          >
            {collection.name}
          </p>

          {collection.description && (
            <p
              style={{
                fontSize: '40px',
                lineHeight: '100%',
                marginTop: '20px',
                color: '#868e96',
                display: 'block',
                lineClamp: 2,
                maxWidth: '85%',
                wordBreak: 'break-word',
              }}
            >
              {collection.description}
            </p>
          )}

          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              gap: 10,
            }}
          >
            {collection.author.avatarUrl && (
              <img
                src={collection.author.avatarUrl}
                width={60}
                height={60}
                alt={`${handle}'s avatar`}
                style={{ borderRadius: '20px', marginTop: 'auto' }}
              />
            )}
            <p
              style={{ color: '#23AFED', fontSize: '40px', lineHeight: '20px' }}
            >
              @{truncateText(truncateText(collection.author.handle), 35)}
            </p>
          </div>
        </div>
      </div>
    ),
  });
}
