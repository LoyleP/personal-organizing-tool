import { lazy, Suspense } from 'react';
import type { Blocks } from '../db';

const Editor = lazy(() => import('./Editor'));

export function LazyEditor(props: { initial: Blocks; onChange: (blocks: Blocks) => void }) {
  return (
    <Suspense fallback={<div className="editor-placeholder" />}>
      <Editor {...props} />
    </Suspense>
  );
}
