import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { getProfile } from '@/features/profile/lib/dal.server';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';

interface Props {
  params: Promise<{ handle: string }>;
}

export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image(props: Props) {
  const { handle } = await props.params;
  const profile = await getProfile(handle, true);

  return await OpenGraphCard({
    children: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          flexGrow: 1,
        }}
      >
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl + '@jpeg'}
            width={140}
            height={140}
            alt={`${handle}'s avatar`}
            style={{ borderRadius: '20px' }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginTop: '35px',
          }}
        >
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
              textAlign: 'center',
              margin: 0,
            }}
          >
            {truncateText(profile.name, 20)}
          </p>
          <p
            style={{
              fontSize: 40,
              lineHeight: 1.2,
              color: '#23AFED',
              margin: 0,
            }}
          >
            @{truncateText(truncateText(profile.handle), 35)}
          </p>

          {/* stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 40,
              marginTop: 40,
            }}
          >
            {profile.urlCardCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.urlCardCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.urlCardCount === 1 ? 'card' : 'cards'}
                </p>
              </div>
            )}
            {profile.collectionCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.collectionCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.collectionCount === 1 ? 'collection' : 'collections'}
                </p>
              </div>
            )}
            {profile.connectionCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.connectionCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.connectionCount === 1 ? 'connection' : 'connections'}
                </p>
              </div>
            )}
            {profile.followerCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.followerCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.followerCount === 1 ? 'follower' : 'followers'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  });
}
