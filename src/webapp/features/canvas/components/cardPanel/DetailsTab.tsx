import { useState } from 'react';
import { Button, Card, Group, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import type { Editor } from 'tldraw';
import { LuExternalLink } from 'react-icons/lu';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import NoteCard from '@/features/notes/components/noteCard/NoteCard';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import useSembleLibraries from '@/features/semble/lib/queries/useSembleLibraries';
import useSembleNotes from '@/features/semble/lib/queries/useSembleNotes';
import { getSembleHref } from '@/lib/utils/link';
import { CARD_TYPE } from '../../const';
import { serverWrite } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { getCardCopies } from '../../lib/nodes';
import { useSaveCard } from '../../lib/useSaveCard';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';

interface Props {
  editor: Editor;
  card: CardShape;
}

export default function DetailsTab(props: Props) {
  const p = props.card.props;

  return (
    <Stack gap="lg">
      <Card component="article" radius="lg" p="sm" withBorder>
        <UrlCardContent
          url={p.url}
          cardContent={{
            url: p.url,
            title: p.title || undefined,
            description: p.description || undefined,
            imageUrl: p.imageUrl || undefined,
            siteName: p.siteName || undefined,
          }}
        />
      </Card>
      <Button
        component={Link}
        href={getSembleHref(p.url)}
        target="_blank"
        variant="light"
        color="gray"
        rightSection={<LuExternalLink />}
      >
        Open in Semble
      </Button>
      <NoteEditor editor={props.editor} card={props.card} />
      <Notes url={p.url} />
      <AddedBy url={p.url} />
    </Stack>
  );
}

function NoteEditor(props: Props) {
  const { data } = useGetCardFromMyLibrary({ url: props.card.props.url });
  const updateAssociations = useUpdateCardAssociations();
  const session = useCanvasSession();
  const saveCard = useSaveCard(props.editor);
  const saved = data.card?.note?.text ?? '';
  const cardId = data.card?.id;
  const [note, setNote] = useState(saved);
  const [pending, setPending] = useState(false);
  const url = props.card.props.url;
  const editor = props.editor;

  // An unsaved card is saved along with its first note
  const save = async () => {
    const text = note.trim();
    if (!text) return;
    if (!cardId) {
      setPending(true);
      await saveCard(url, text);
      setPending(false);
      return;
    }
    try {
      await session.track(
        url,
        updateAssociations.mutateAsync({ cardId, note: text }),
      );
      const copy = getCardCopies(editor, url)[0];
      if (copy) {
        serverWrite(editor, () =>
          editor.updateShape({
            id: copy.id,
            type: CARD_TYPE,
            props: { note: text },
          }),
        );
      }
    } catch {
      notifications.show({
        message: 'Could not save note.',
        color: 'red',
        position: 'top-center',
      });
    }
  };

  const dirty = note.trim() !== saved;

  return (
    <Stack gap="xs">
      <SectionTitle>Your note</SectionTitle>
      <Textarea
        autosize
        minRows={2}
        maxRows={8}
        placeholder="Why is this worth keeping?"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
      />
      <Group justify="space-between" wrap="nowrap">
        <Text c="gray" fz="sm">
          {cardId ? '' : 'Saving a note saves the card to your library.'}
        </Text>
        <Button
          disabled={!dirty || !note.trim()}
          loading={updateAssociations.isPending || pending}
          onClick={save}
        >
          {cardId ? 'Save note' : 'Save card & note'}
        </Button>
      </Group>
    </Stack>
  );
}

function SectionTitle(props: { children: string }) {
  return (
    <Text fz="lg" fw={600}>
      {props.children}
    </Text>
  );
}

function Notes(props: { url: string }) {
  const notes = useSembleNotes({ url: props.url, limit: 5 });
  const items = notes.data.pages.flatMap((p) => p.notes);
  if (!items.length) return null;

  return (
    <Stack gap="xs">
      <SectionTitle>Notes</SectionTitle>
      {items.map((n) => (
        <NoteCard
          key={n.id}
          id={n.id}
          author={n.author}
          createdAt={n.createdAt}
          note={n.note}
        />
      ))}
    </Stack>
  );
}

function AddedBy(props: { url: string }) {
  const libraries = useSembleLibraries({ url: props.url, limit: 5 });
  const items = libraries.data.pages.flatMap((p) => p.libraries);
  if (!items.length) return null;

  return (
    <Stack gap="xs">
      <SectionTitle>Added by</SectionTitle>
      {items.map((l) => (
        <ProfileCard
          key={l.user.id}
          profile={l.user}
          addedAt={l.card.createdAt}
        />
      ))}
    </Stack>
  );
}
