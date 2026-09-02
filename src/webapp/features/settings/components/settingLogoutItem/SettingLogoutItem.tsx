'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@mantine/core';
import { IoMdLogOut } from 'react-icons/io';
import SettingItemSkeleton from '../settingItem/Skeleton.SettingItem';

export default function SettingLogoutItem() {
  const { logout, isLoading, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout({ redirectTo: '/' });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) return <SettingItemSkeleton />;
  if (!isAuthenticated) return null;

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
