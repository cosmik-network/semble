import {
  Skeleton,
  Avatar,
  Group,
  Alert,
  Menu,
  Card,
  Text,
  UnstyledButton,
} from '@mantine/core';
import useMyProfile from '../../lib/queries/useMyProfile';
import { MdBugReport, MdCollectionsBookmark } from 'react-icons/md';
import { TbStackForward } from 'react-icons/tb';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoMdLogOut } from 'react-icons/io';
import { useNavbarContext } from '@/providers/navbar';
import { BiSolidUserCircle } from 'react-icons/bi';
import { useOs } from '@mantine/hooks';
import { BsThreeDots } from 'react-icons/bs';
import styles from './ProfileMenu.module.css';

export default function ProfileMenu() {
  const router = useRouter();
  const os = useOs();
  const { toggleMobile } = useNavbarContext();
  const { data, error, isPending } = useMyProfile();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isPending || !data) {
    return <Skeleton w={38} h={38} radius="md" ml={4} />;
  }

  if (error) {
    return <Alert color="red" title="Could not load profile" />;
  }

  return (
    <Group>
      <Menu shadow="sm" width={280}>
        <Menu.Target>
          <Card px={5} py={5} flex={1} className={styles.root}>
            <UnstyledButton>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={'xs'} c={'bright'} wrap="nowrap">
                  <Avatar
                    src={data.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
                  />
                  <Text fw={600} lineClamp={1}>
                    {data.name}
                  </Text>
                </Group>
                <BsThreeDots />
              </Group>
            </UnstyledButton>
          </Card>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            component={Link}
            href={`/profile/${data.handle}`}
            onClick={toggleMobile}
            leftSection={<BiSolidUserCircle size={22} />}
            color="gray"
          >
            View profile
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            component="a"
            href="https://tangled.org/@cosmik.network/semble/issues"
            target="_blank"
            leftSection={<MdBugReport size={22} />}
            color="gray"
          >
            Submit an issue
          </Menu.Item>

          <Menu.Item
            color="gray"
            leftSection={<MdCollectionsBookmark size={22} />}
            component={Link}
            href={'/bookmarklet'}
            target="_blank"
          >
            Install bookmarklet
          </Menu.Item>

          {os === 'ios' && (
            <Menu.Item
              color="gray"
              leftSection={<TbStackForward size={22} />}
              component={Link}
              href={
                'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6'
              }
              target="_blank"
            >
              Install iOS shortcut
            </Menu.Item>
          )}

          <Menu.Item
            color="red"
            leftSection={<IoMdLogOut size={22} />}
            onClick={handleLogout}
          >
            Log out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
