import { Link, useLocation } from 'wouter';
import { create, newNote, useNotes, useProjects, useTasks } from '../store';
import { Icon } from './Icon';

/** Phone replacement for the sidebar: projects and loose notes. */
export function Browse() {
  const projects = useProjects() ?? [];
  const notes = useNotes() ?? [];
  const tasks = useTasks() ?? [];
  const [, navigate] = useLocation();

  const newProject = async () => {
    const p = await create('project', { name: '', emoji: '📁', order: projects.reduce((m, p) => Math.max(m, p.order), 0) + 1 });
    navigate(`/p/${p.id}`);
  };

  return (
    <div className="browse">
      <h1 className="page-title">Browse</h1>
      <div className="group-head">
        <span>Projects</span>
        <button className="icon-btn" onClick={newProject} aria-label="New project">
          <Icon name="plus" />
        </button>
      </div>
      <div className="group">
        {projects.map((p) => {
          const open = tasks.filter((t) => t.projectId === p.id && t.status !== 'done').length;
          return (
            <Link key={p.id} href={`/p/${p.id}`} className="group-row">
              <span className="nav-emoji">{p.emoji}</span>
              <span className="truncate">{p.name || 'Untitled'}</span>
              <span className="muted small">{open || ''}</span>
              <Icon name="chevron" size={14} />
            </Link>
          );
        })}
        {!projects.length && <div className="tempty">No projects yet</div>}
      </div>
      <div className="group-head">
        <span>Notes</span>
        <button className="icon-btn" onClick={async () => navigate(`/n/${(await newNote(null)).id}`)} aria-label="New note">
          <Icon name="plus" />
        </button>
      </div>
      <div className="group">
        {notes
          .filter((n) => !n.projectId)
          .map((n) => (
            <Link key={n.id} href={`/n/${n.id}`} className="group-row">
              <span className="nav-emoji">{n.emoji}</span>
              <span className="truncate">{n.title || 'Untitled'}</span>
              <span />
              <Icon name="chevron" size={14} />
            </Link>
          ))}
        {!notes.some((n) => !n.projectId) && <div className="tempty">No notes yet</div>}
      </div>
    </div>
  );
}
