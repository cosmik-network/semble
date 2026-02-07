import Link from 'next/link';
import { NavLink, Stack } from '@mantine/core';
import { BiCollection, BiRightArrowAlt } from 'react-icons/bi';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import useMyCollections from '../../lib/queries/useMyCollections';
import { useToggle } from '@mantine/hooks';
import CollectionsNavListError from './Error.CollectionsNavList';
import CreateCollectionShortcut from '../createCollectionShortcut/CreateCollectionShortcut';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { getRecordKey } from '@/lib/utils/atproto';
import { useNavbarContext } from '@/providers/navbar';

export default function CollectionsNavList() {
  const { toggleMobile } = useNavbarContext();
  const { data, error } = useMyCollections({ limit: 30 });
  const { data: profile } = useMyProfile();
  const [opened, toggleMenu] = useToggle([true, false]);

  if (error) {
    return <CollectionsNavListError />;
  }

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <NavLink
      variant="subtle"
      c="gray"
      label="Collections"
      leftSection={<BiCollection size={22} />}
      opened={opened}
      onClick={() => toggleMenu()}
    >
      <CreateCollectionShortcut />

      <NavLink
        component={Link}
        href={`/profile/${profile.handle}/collections`}
        label="View all"
        variant="subtle"
        c="blue"
        leftSection={<BiRightArrowAlt size={25} />}
        onClick={toggleMobile}
      />

      <Stack gap={0}>
        {collections.map((collection) => (
          <CollectionNavItem
            key={collection.id}
            name={collection.name}
            url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!!)}`}
            cardCount={collection.cardCount}
            accessType={collection.accessType}
            uri={collection.uri}
          />
        ))}
      </Stack>
    </NavLink>
  );
}
