import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PRIORITIES, STATUSES, type Priority, type Status } from '../db';
import { patch, remove, useProjects, useTasks } from '../store';
import { AutoTitle } from './AutoTitle';
import { Icon } from './Icon';
import { LazyEditor } from './LazyEditor';

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <span className="prop-label">{label}</span>
      <div className="prop-value">{children}</div>
    </div>
  );
}

function Tags({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const tasks = useTasks();
  const [draft, setDraft] = useState('');
  const known = useMemo(() => [...new Set((tasks ?? []).flatMap((t) => t.tags))].sort(), [tasks]);
  const commit = () => {
    const tag = draft.trim().replace(/,$/, '');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };
  return (
    <div className="tags">
      {value.map((t) => (
        <span key={t} className="pill tag">
          {t}
          <button onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input
        list="known-tags"
        value={draft}
        placeholder={value.length ? '' : 'Add tag'}
        onChange={(e) => (e.target.value.endsWith(',') ? (setDraft(e.target.value), queueMicrotask(commit)) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={commit}
      />
      <datalist id="known-tags">
        {known.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

export function TaskPeek({ id, onClose }: { id: string; onClose: () => void }) {
  const task = useLiveQuery(() => db.tasks.get(id).then((t) => (t && !t.deleted ? t : null)), [id]);
  const projects = useProjects() ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement).isContentEditable) onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  if (task === undefined) return null;
  const set = (changes: Parameters<typeof patch<'task'>>[2]) => patch('task', id, changes);

  return (
    <div className="peek-layer">
      <div className="peek-scrim" onClick={onClose} />
      <aside className="peek" role="dialog" aria-label="Task">
        <div className="peek-bar">
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          {task && (
            <button
              className="icon-btn"
              onClick={() => {
                remove('task', id);
                onClose();
              }}
              aria-label="Delete task"
            >
              <Icon name="trash" />
            </button>
          )}
        </div>
        {!task ? (
          <p className="muted pad">This task was deleted.</p>
        ) : (
          <div className="peek-body">
            <AutoTitle value={task.title} placeholder="Untitled" autoFocus={!task.title} onChange={(title) => set({ title })} />
            <div className="props">
              <Prop label="Status">
                <select className={`pill-select status-${task.status}`} value={task.status} onChange={(e) => set({ status: e.target.value as Status })}>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop label="Priority">
                <select
                  className={`pill-select ${task.priority ? `prio-${task.priority}` : 'empty'}`}
                  value={task.priority ?? ''}
                  onChange={(e) => set({ priority: (e.target.value || null) as Priority | null })}
                >
                  <option value="">Empty</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop label="Due date">
                <input type="date" className="plain-input" value={task.due ?? ''} onChange={(e) => set({ due: e.target.value || null })} />
                {task.due && (
                  <button className="icon-btn" onClick={() => set({ due: null })} aria-label="Clear due date">
                    <Icon name="close" size={12} />
                  </button>
                )}
              </Prop>
              <Prop label="Project">
                <select className="plain-input" value={task.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || null })}>
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name || 'Untitled'}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop label="Tags">
                <Tags value={task.tags} onChange={(tags) => set({ tags })} />
              </Prop>
            </div>
            <div className="divider" />
            <LazyEditor initial={task.body} onChange={(body) => set({ body })} />
          </div>
        )}
      </aside>
    </div>
  );
}
