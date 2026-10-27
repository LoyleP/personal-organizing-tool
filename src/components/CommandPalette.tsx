import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { create, useNotes, useProjects, useTasks } from '../store';
import { Icon, type IconName } from './Icon';

interface Item {
  id: string;
  label: string;
  hint: string;
  icon: IconName | string;
  run: () => void | Promise<void>;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const tasks = useTasks() ?? [];
  const notes = useNotes() ?? [];
  const projects = useProjects() ?? [];
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => navigate(href);
    const actions: Item[] = [
      {
        id: 'new-task',
        label: 'New task',
        hint: 'Action',
        icon: 'plus',
        run: async () => {
          const t = await create('task', { title: q, status: 'todo', priority: null, due: null, tags: [], projectId: null, body: null, order: 0 });
          navigate(`${location.pathname}?t=${t.id}`);
        },
      },
      {
        id: 'new-note',
        label: 'New note',
        hint: 'Action',
        icon: 'note',
        run: async () => navigate(`/n/${(await create('note', { title: q, emoji: '📄', projectId: null, body: null })).id}`),
      },
      { id: 'go-tasks', label: 'Tasks', hint: 'Go to', icon: 'board', run: go('/') },
      { id: 'go-cal', label: 'Calendar', hint: 'Go to', icon: 'calendar', run: go('/calendar') },
    ];
    const all: Item[] = [
      ...projects.map((p) => ({ id: p.id, label: p.name || 'Untitled', hint: 'Project', icon: p.emoji, run: go(`/p/${p.id}`) })),
      ...notes.map((n) => ({ id: n.id, label: n.title || 'Untitled', hint: 'Note', icon: n.emoji, run: go(`/n/${n.id}`) })),
      ...tasks.map((t) => ({
        id: t.id,
        label: t.title || 'Untitled',
        hint: `Task · ${t.status === 'doing' ? 'In progress' : t.status === 'done' ? 'Done' : 'To do'}`,
        icon: 'board',
        run: () => navigate(`${location.pathname}?t=${t.id}`),
      })),
    ];
    const needle = q.trim().toLowerCase();
    if (!needle) return [...actions, ...all.slice(0, 8)];
    return [
      ...all.filter((i) => i.label.toLowerCase().includes(needle)).slice(0, 30),
      ...actions.filter((a) => a.id.startsWith('new')),
    ];
  }, [q, tasks, notes, projects, navigate]);

  const run = async (item?: Item) => {
    if (!item) return;
    onClose();
    await item.run();
  };

  return (
    <div className="palette-layer" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" />
          <input
            autoFocus
            placeholder="Search or create…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, items.length - 1)));
              else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)));
              else if (e.key === 'Enter') run(items[sel]);
              else if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <ul className="palette-list">
          {items.map((item, i) => (
            <li key={item.id} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => run(item)}>
              <span className="palette-icon">
                {item.icon.length <= 3 ? item.icon : <Icon name={item.icon as IconName} />}
              </span>
              <span className="truncate">
                {item.id.startsWith('new') && q ? `${item.label}: “${q}”` : item.label}
              </span>
              <span className="muted small">{item.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
