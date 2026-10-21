import type { CSSProperties } from 'react';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import { useAuth } from '@/hooks/useAuth';

// Mantine cards read their shadow from a CSS variable, which a shadowed parent passes down
const noShadow = { '--paper-shadow': 'none' } as CSSProperties;

// The webapp's inline note; canvas notes are always the user's own
export default function CanvasNote(props: { text: string }) {
  const { user } = useAuth();
  return (
    <div style={noShadow}>
      <NoteCardInline
        note={{ id: '', text: props.text }}
        cardAuthor={user ?? undefined}
      />
    </div>
  );
}
