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
  SegmentedControl,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import useMyProfile from '../../lib/queries/useMyProfile';
import { MdOutlineInstallMobile, MdOutlineColorLens } from 'react-icons/md';
import { TbStackForward, TbBrandFirefox } from 'react-icons/tb';
import { FiChrome } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoMdLogOut, IoMdHelpCircleOutline } from 'react-icons/io';
import { useNavbarContext } from '@/providers/navbar';
import { useOs } from '@mantine/hooks';
import { BsThreeDots } from 'react-icons/bs';
import styles from './ProfileMenu.module.css';
import { sanitizeText } from '@/lib/utils/text';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '../botLabel/BotLabel';

export default function ProfileMenu() {
  const router = useRouter();
  const os = useOs();
  const { toggleMobile } = useNavbarContext();
  const { data, error, isPending } = useMyProfile();
  const { logout } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

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

                  {isBotAccount(data) && <BotLabel />}
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
                <Group gap={'xs'} wrap="nowrap">
                  <Text fw={600} c={'bright'} lineClamp={1}>
                    {sanitizeText(data.name) || data.handle}
                  </Text>
                  {isBotAccount(data) && <BotLabel />}
                </Group>

                <Text fw={600} c={'gray'} lineClamp={1}>
                  @{data.handle}
                </Text>
              </Stack>
            </Group>
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            component="div"
            color="gray"
            closeMenuOnClick={false}
            className={styles.themeItem}
            leftSection={<MdOutlineColorLens size={22} />}
            rightSection={
              <SegmentedControl
                size="xs"
                value={colorScheme}
                onChange={(value) =>
                  setColorScheme(value as 'light' | 'dark' | 'auto')
                }
                data={[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                  { label: 'Auto', value: 'auto' },
                ]}
              />
            }
          >
            Theme
          </Menu.Item>

          <Menu.Item
            color="gray"
            leftSection={<IoMdHelpCircleOutline size={22} />}
            component={Link}
            href={'/settings/help'}
            onClick={toggleMobile}
          >
            Help
          </Menu.Item>

          <Menu.Item
            component="a"
            href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
            target="_blank"
            leftSection={<FiChrome size={22} />}
            color="gray"
          >
            Chrome extension
          </Menu.Item>

          <Menu.Item
            component="a"
            href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
            target="_blank"
            leftSection={<TbBrandFirefox size={22} />}
            color="gray"
          >
            Firefox extension
          </Menu.Item>

          {os === 'ios' && (
            <Menu.Item
              color="gray"
              leftSection={<TbStackForward size={22} />}
              component={Link}
              href={'/ios-shortcut'}
              target="_blank"
            >
              Install iOS shortcut
            </Menu.Item>
          )}

          <Menu.Item
            color="gray"
            leftSection={<MdOutlineInstallMobile size={22} />}
            component={Link}
            href={'/install-app'}
            target="_blank"
          >
            Install app
          </Menu.Item>

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
