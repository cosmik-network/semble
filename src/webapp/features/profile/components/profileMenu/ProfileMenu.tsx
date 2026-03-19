'use client';

import {
  Skeleton,
  Avatar,
  Group,
  Alert,
  Menu,
  Card,
  Text,
  UnstyledButton,
  Stack,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import useMyProfile from '../../lib/queries/useMyProfile';
import {
  MdOutlineBugReport,
  MdOutlineCollectionsBookmark,
  MdOutlineSmartphone,
  MdOutlineDarkMode,
  MdOutlineLightMode,
} from 'react-icons/md';
import { TbStackForward } from 'react-icons/tb';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoMdLogOut } from 'react-icons/io';
import { useNavbarContext } from '@/providers/navbar';
import { useOs } from '@mantine/hooks';
import { BsThreeDots } from 'react-icons/bs';
import styles from './ProfileMenu.module.css';
import { sanitizeText } from '@/lib/utils/text';

const schemes = ['light', 'dark', 'auto'] as const;
type ColorScheme = (typeof schemes)[number];

const schemeConfig: Record<
  ColorScheme,
  { icon: React.ReactNode; label: string; next: ColorScheme }
> = {
  light: {
    icon: <MdOutlineLightMode size={22} />,
    label: 'Light',
    next: 'dark',
  },
  dark: { icon: <MdOutlineDarkMode size={22} />, label: 'Dark', next: 'auto' },
  auto: {
    icon: <MdOutlineSmartphone size={22} />,
    label: 'Auto',
    next: 'light',
  },
};

export default function ProfileMenu() {
  const router = useRouter();
  const os = useOs();
  const { toggleMobile } = useNavbarContext();
  const { data, error, isPending } = useMyProfile();
  const { logout } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const current = schemeConfig[colorScheme as ColorScheme] ?? schemeConfig.auto;

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
          >
            <Group gap={'xs'} wrap="nowrap">
              <Avatar
                src={data.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
                alt={`${data.handle}'s avatar`}
              />

              <Stack gap={0}>
                <Text fw={600} c={'bright'} lineClamp={1}>
                  {sanitizeText(data.name) || data.handle}
                </Text>
                <Text fw={600} c={'gray'} lineClamp={1}>
                  @{data.handle}
                </Text>
              </Stack>
            </Group>
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            color="gray"
            closeMenuOnClick={false}
            leftSection={current.icon}
            onClick={() => setColorScheme(current.next)}
          >
            Theme: {current.label}
          </Menu.Item>

          <Menu.Item
            component="a"
            href="https://tangled.org/@cosmik.network/semble/issues"
            target="_blank"
            leftSection={<MdOutlineBugReport size={22} />}
            color="gray"
          >
            Submit an issue
          </Menu.Item>

          <Menu.Item
            color="gray"
            leftSection={<MdOutlineCollectionsBookmark size={22} />}
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
