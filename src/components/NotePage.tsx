import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'wouter';
import { db } from '../db';
import { patch, remove, useProjects } from '../store';
import { AutoTitle } from './AutoTitle';
import { EmojiButton } from './EmojiButton';
import { Icon } from './Icon';
import { LazyEditor } from './LazyEditor';
import { Topbar } from './Topbar';

export function NotePage({ id, onMenu }: { id: string; onMenu: () => void }) {
  const note = useLiveQuery(() => db.notes.get(id).then((n) => (n && !n.deleted ? n : null)), [id]);
  const projects = useProjects() ?? [];
  const [, navigate] = useLocation();

  if (note === undefined) return null;
  if (note === null)
    return (
      <>
        <Topbar crumbs={['Notes']} onMenu={onMenu} />
        <p className="muted pad">This note doesn't exist.</p>
      </>
    );

  const project = projects.find((p) => p.id === note.projectId);
  return (
    <>
      <Topbar
        crumbs={[
          ...(project ? [<Link href={`/p/${project.id}`}>{project.emoji} {project.name || 'Untitled'}</Link>] : []),
          `${note.emoji} ${note.title || 'Untitled'}`,
        ]}
        onMenu={onMenu}
      >
        <select className="plain-input small" value={note.projectId ?? ''} onChange={(e) => patch('note', id, { projectId: e.target.value || null })}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.name || 'Untitled'}
            </option>
          ))}
        </select>
        <button
          className="icon-btn"
          aria-label="Delete note"
          onClick={() => {
            remove('note', id);
            navigate(project ? `/p/${project.id}` : '/');
          }}
        >
          <Icon name="trash" />
        </button>
      </Topbar>
      <article className="page">
        <EmojiButton value={note.emoji} onChange={(emoji) => patch('note', id, { emoji })} />
        <AutoTitle value={note.title} placeholder="Untitled" autoFocus={!note.title} onChange={(title) => patch('note', id, { title })} />
        <LazyEditor initial={note.body} onChange={(body) => patch('note', id, { body })} />
      </article>
    </>
  );
}
