import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useSearchParams } from 'wouter';
import { db } from '../db';
import { create, patch, removeProject, useNotes } from '../store';
import { AutoTitle } from './AutoTitle';
import { Board } from './Board';
import { EmojiButton } from './EmojiButton';
import { Icon } from './Icon';
import { Topbar } from './Topbar';

export function ProjectPage({ id, onMenu }: { id: string; onMenu: () => void }) {
  const project = useLiveQuery(() => db.projects.get(id).then((p) => (p && !p.deleted ? p : null)), [id]);
  const notes = (useNotes() ?? []).filter((n) => n.projectId === id);
  const [params, setParams] = useSearchParams();
  const [, navigate] = useLocation();
  const tab = params.get('view') === 'notes' ? 'notes' : 'board';

  if (project === undefined) return null;
  if (project === null)
    return (
      <>
        <Topbar crumbs={['Projects']} onMenu={onMenu} />
        <p className="muted pad">This project doesn't exist.</p>
      </>
    );

  const newNote = async () => {
    const n = await create('note', { title: '', emoji: '📄', projectId: id, body: null });
    navigate(`/n/${n.id}`);
  };

  return (
    <>
      <Topbar crumbs={[`${project.emoji} ${project.name || 'Untitled'}`]} onMenu={onMenu}>
        <button
          className="icon-btn"
          aria-label="Delete project"
          onClick={() => {
            if (confirm('Delete this project? Its tasks and notes are kept, without a project.')) {
              removeProject(id);
              navigate('/');
            }
          }}
        >
          <Icon name="trash" />
        </button>
      </Topbar>
      <div className="project-head">
        <EmojiButton value={project.emoji} onChange={(emoji) => patch('project', id, { emoji })} />
        <AutoTitle key={id} value={project.name} placeholder="Untitled project" autoFocus={!project.name} onChange={(name) => patch('project', id, { name })} />
        <div className="tabs">
          <button className={tab === 'board' ? 'active' : ''} onClick={() => setParams({})}>
            <Icon name="board" size={14} /> Board
          </button>
          <button className={tab === 'notes' ? 'active' : ''} onClick={() => setParams({ view: 'notes' })}>
            <Icon name="note" size={14} /> Notes <span className="col-count">{notes.length}</span>
          </button>
        </div>
      </div>
      {tab === 'board' ? (
        <Board projectId={id} />
      ) : (
        <div className="note-list">
          {notes.map((n) => (
            <Link key={n.id} href={`/n/${n.id}`} className="note-row">
              <span>{n.emoji}</span>
              <span className="truncate">{n.title || 'Untitled'}</span>
              <span className="muted small">{new Date(n.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))}
          <button className="col-add" onClick={newNote}>
            <Icon name="plus" size={14} /> New note
          </button>
        </div>
      )}
    </>
  );
}
