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
            marginTop: '35px',
          }}
        >
          <p
            style={{
              fontSize: '40px',
              lineHeight: '20px',
              color: '#e803ff',
            }}
          >
            Collection
          </p>
          <p
            style={{
              fontSize: '64px',
              lineHeight: '20px',
            }}
          >
            {truncateText(truncateText(collection.name), 30)}
          </p>
          <p
            style={{
              fontSize: '40px',
              lineHeight: '20px',
              marginTop: '40px',
            }}
          >
            <span>By&nbsp;</span>
            <span style={{ color: '#23AFED' }}>
              @{truncateText(truncateText(collection.author.handle), 35)}
            </span>
          </p>
        </div>
      </div>
    ),
  });
}
