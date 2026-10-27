import { useState } from 'react';
import type { Project, Status, Task } from '../db';
import { create, patch, today } from '../store';
import { Icon } from './Icon';
import { StatusIcon } from './StatusIcon';

const SECTIONS: { id: Status; label: string }[] = [
  { id: 'doing', label: 'In progress' },
  { id: 'todo', label: 'To do' },
  { id: 'done', label: 'Done' },
];
const NEXT: Record<Status, Status> = { todo: 'doing', doing: 'done', done: 'todo' };

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const topOrder = (list: Task[]) => (list[0]?.order ?? 1) - 1;

/** Phone layout of the board: one scrolling list grouped by status, like Linear mobile. */
export function TaskList({
  columns,
  projectId,
  projects,
  onOpen,
}: {
  columns: Record<Status, Task[]>;
  projectId: string | null;
  projects?: Map<string, Project>;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<Status, boolean>>({ doing: false, todo: false, done: true });
  const [adding, setAdding] = useState<Status | null>(null);
  const now = today();

  const add = (status: Status, title: string) =>
    create('task', { title, status, priority: null, due: null, tags: [], projectId, body: null, order: topOrder(columns[status]) });

  return (
    <div className="tlist">
      {SECTIONS.map(({ id, label }) => {
        const tasks = columns[id];
        const open = !collapsed[id];
        return (
          <section key={id} className="tsection">
            <header className="tsection-head" onClick={() => setCollapsed({ ...collapsed, [id]: open })}>
              <span className={`chev ${open ? 'open' : ''}`}>
                <Icon name="chevron" size={12} />
              </span>
              <span>{label}</span>
              <span className="col-count">{tasks.length}</span>
              <button
                className="icon-btn"
                aria-label={`New ${label} task`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed({ ...collapsed, [id]: false });
                  setAdding(id);
                }}
              >
                <Icon name="plus" />
              </button>
            </header>
            {open && (
              <>
                {adding === id && (
                  <div className="trow">
                    <span className="status-btn">
                      <StatusIcon status={id} size={18} />
                    </span>
                    <input
                      className="trow-input"
                      autoFocus
                      enterKeyHint="done"
                      placeholder="Task name"
                      onKeyDown={(e) => {
                        const title = e.currentTarget.value.trim();
                        if (e.key === 'Enter' && title) {
                          add(id, title);
                          e.currentTarget.value = '';
                        } else if (e.key === 'Escape') setAdding(null);
                      }}
                      onBlur={(e) => {
                        const title = e.currentTarget.value.trim();
                        if (title) add(id, title);
                        setAdding(null);
                      }}
                    />
                  </div>
                )}
                {tasks.map((t) => {
                  const project = t.projectId ? projects?.get(t.projectId) : undefined;
                  const overdue = t.due && t.status !== 'done' && t.due < now;
                  const hasMeta = t.priority || t.due || project || t.tags.length > 0;
                  return (
                    <div key={t.id} className="trow" onClick={() => onOpen(t.id)}>
                      <button
                        className="status-btn"
                        aria-label={`Mark ${NEXT[t.status]}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = NEXT[t.status];
                          patch('task', t.id, { status: next, order: topOrder(columns[next]) });
                        }}
                      >
                        <StatusIcon status={t.status} size={18} />
                      </button>
                      <div className="trow-main">
                        <div className={`trow-title ${t.status === 'done' ? 'done' : ''}`}>{t.title || 'Untitled'}</div>
                        {hasMeta && (
                          <div className="card-meta">
                            {t.priority && <span className={`pill prio-${t.priority}`}>{t.priority}</span>}
                            {t.due && <span className={`card-due ${overdue ? 'overdue' : ''}`}>{shortDate(t.due)}</span>}
                            {project && (
                              <span className="card-project">
                                {project.emoji} {project.name || 'Untitled'}
                              </span>
                            )}
                            {t.tags.map((tag) => (
                              <span key={tag} className="pill tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!tasks.length && adding !== id && <div className="tempty">No tasks</div>}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
