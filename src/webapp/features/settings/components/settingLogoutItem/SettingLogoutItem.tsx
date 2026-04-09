'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { IoMdLogOut } from 'react-icons/io';
import SettingItemSkeleton from '../settingItem/Skeleton.SettingItem';

export default function SettingLogoutItem() {
  const { logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) return <SettingItemSkeleton />;

  return (
    <Button
      variant="light"
      size="lg"
      justify="start"
      radius={'lg'}
      color="red"
      leftSection={<IoMdLogOut size={26} />}
      onClick={handleLogout}
      my={1}
    >
      Log out
    </Button>
  );
}
