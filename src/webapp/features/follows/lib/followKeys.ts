export const followKeys = {
  all: () => ['follows'] as const,
  followingUsers: (identifier: string, limit?: number) =>
    [...followKeys.all(), 'following-users', identifier, limit] as const,
  followers: (identifier: string, limit?: number) =>
    [...followKeys.all(), 'followers', identifier, limit] as const,
  followingCollections: (identifier: string, limit?: number) =>
    [...followKeys.all(), 'following-collections', identifier, limit] as const,
  collectionFollowers: (collectionId: string, limit?: number) =>
    [...followKeys.all(), 'collection-followers', collectionId, limit] as const,
  followingCount: (identifier: string) =>
    [...followKeys.all(), 'following-count', identifier] as const,
  followersCount: (identifier: string) =>
    [...followKeys.all(), 'followers-count', identifier] as const,
  followingCollectionsCount: (identifier: string) =>
    [...followKeys.all(), 'following-collections-count', identifier] as const,
  collectionFollowersCount: (collectionId: string) =>
    [...followKeys.all(), 'collection-followers-count', collectionId] as const,
};
