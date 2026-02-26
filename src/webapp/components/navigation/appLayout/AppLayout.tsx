import { AppShellMain } from '@mantine/core';
import Navbar from '@/components/navigation/navbar/Navbar';
import ComposerDrawer from '@/features/composer/components/composerDrawer/ComposerDrawer';
import BottomBar from '../bottomBar/BottomBar';
import AppShellWrapper from './AppShellWrapper';

interface Props {
  children: React.ReactNode;
}

export default function AppLayout(props: Props) {
  return (
    <AppShellWrapper
      navbar={<Navbar />}
      main={
        <AppShellMain>
          {props.children}
          <ComposerDrawer />
        </AppShellMain>
      }
      footer={<BottomBar />}
    />
  );
}
