import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Blocks } from '../db';

const dark = matchMedia('(prefers-color-scheme: dark)');
const useDark = () =>
  useSyncExternalStore(
    (l) => (dark.addEventListener('change', l), () => dark.removeEventListener('change', l)),
    () => dark.matches,
  );

export default function Editor({ initial, onChange }: { initial: Blocks; onChange: (blocks: Blocks) => void }) {
  const editor = useCreateBlockNote({
    initialContent: initial?.length ? (initial as PartialBlock[]) : undefined,
  });
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useRef(onChange);
  save.current = onChange;

  // Flush the last keystrokes when the page closes.
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current);
        save.current(editor.document);
      }
    },
    [editor],
  );

  return (
    <BlockNoteView
      editor={editor}
      theme={useDark() ? 'dark' : 'light'}
      onChange={() => {
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
          pending.current = null;
          save.current(editor.document);
        }, 300);
      }}
    />
  );
}
