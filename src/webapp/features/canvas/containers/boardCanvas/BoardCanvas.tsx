'use client';

import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import LazyCanvasEditor from '../../components/canvasEditor/LazyCanvasEditor';

export default function BoardCanvas() {
  const { data: profile } = useMyProfile();

  return (
    <LazyCanvasEditor
      userId={profile.id}
      scope="board:default"
      title="My canvas"
      backHref="/home"
    />
  );
}
