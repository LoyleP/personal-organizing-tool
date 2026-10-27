import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { create, useNotes, useProjects } from '../store';
import { useSyncStatus } from '../sync';
import { Icon } from './Icon';
import type { Note } from '../db';

const SYNC_LABEL = { idle: 'Synced', syncing: 'Syncing…', offline: 'Offline · saved locally', error: 'Not synced · saved locally' };

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem('sidebar-open') ?? '{}');
  } catch {
    return {};
  }
}

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const [location, navigate] = useLocation();
  const projects = useProjects() ?? [];
  const notes = useNotes() ?? [];
  const status = useSyncStatus();
  const [open, setOpen] = useState(readOpen);

  const toggle = (id: string) => {
    const next = { ...open, [id]: !open[id] };
    setOpen(next);
    try {
      localStorage.setItem('sidebar-open', JSON.stringify(next));
    } catch {}
  };

  const newProject = async () => {
    const p = await create('project', {
      name: '',
      emoji: '📁',
      order: projects.reduce((m, p) => Math.max(m, p.order), 0) + 1,
    });
    navigate(`/p/${p.id}`);
  };
  const newNote = async (projectId: string | null = null) => {
    const n = await create('note', { title: '', emoji: '📄', projectId, body: null });
    if (projectId && !open[projectId]) toggle(projectId);
    navigate(`/n/${n.id}`);
  };

  const noteLink = (n: Note, nested = false) => (
    <Link key={n.id} href={`/n/${n.id}`} className={`nav-item ${nested ? 'nested' : ''} ${location === `/n/${n.id}` ? 'active' : ''}`}>
      <span className="nav-emoji">{n.emoji}</span>
      <span className="truncate">{n.title || 'Untitled'}</span>
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <button className="nav-item" onClick={onSearch}>
          <Icon name="search" />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <Link href="/" className={`nav-item ${location === '/' ? 'active' : ''}`}>
          <Icon name="board" />
          <span>Tasks</span>
        </Link>

        <div className="nav-section">
          <span>Projects</span>
          <button className="icon-btn" onClick={newProject} aria-label="New project">
            <Icon name="plus" size={14} />
          </button>
        </div>
        {projects.map((p) => {
          const children = notes.filter((n) => n.projectId === p.id);
          return (
            <div key={p.id}>
              <div className={`nav-item ${location === `/p/${p.id}` ? 'active' : ''}`}>
                <button
                  className={`chev ${open[p.id] ? 'open' : ''}`}
                  onClick={() => toggle(p.id)}
                  aria-label={open[p.id] ? 'Collapse' : 'Expand'}
                >
                  <Icon name="chevron" size={12} />
                </button>
                <Link href={`/p/${p.id}`} className="nav-link">
                  <span className="nav-emoji">{p.emoji}</span>
                  <span className="truncate">{p.name || 'Untitled'}</span>
                </Link>
                <button className="icon-btn hover-only" onClick={() => newNote(p.id)} aria-label="New note in project">
                  <Icon name="plus" size={14} />
                </button>
              </div>
              {open[p.id] &&
                (children.length ? children.map((n) => noteLink(n, true)) : <div className="nav-empty">No notes</div>)}
            </div>
          );
        })}
        {!projects.length && <div className="nav-empty">No projects yet</div>}

        <div className="nav-section">
          <span>Notes</span>
          <button className="icon-btn" onClick={() => newNote()} aria-label="New note">
            <Icon name="plus" size={14} />
          </button>
        </div>
        {notes.filter((n) => !n.projectId).map((n) => noteLink(n))}
      </div>
      <div className={`sync sync-${status}`}>
        <span className="sync-dot" />
        {SYNC_LABEL[status]}
      </div>
    </aside>
  );
}
