import { memo, useMemo, useState } from 'react';
import { useSearchParams } from 'wouter';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STATUSES, type Project, type Status, type Task } from '../db';
import { between, create, patch, today, useProjects, useTasks } from '../store';
import { Icon } from './Icon';
import { TaskList } from './TaskList';
import { useMobile } from '../useMobile';

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const Card = memo(function Card({ task, project, overlay }: { task: Task; project?: Project; overlay?: boolean }) {
  const overdue = task.due && task.status !== 'done' && task.due < today();
  return (
    <div className={`card ${overlay ? 'overlay' : ''}`}>
      <div className={`card-title ${task.status === 'done' ? 'done' : ''}`}>{task.title || 'Untitled'}</div>
      {(task.priority || task.due || task.tags.length > 0 || project) && (
        <div className="card-meta">
          {task.priority && <span className={`pill prio-${task.priority}`}>{task.priority}</span>}
          {task.due && <span className={`card-due ${overdue ? 'overdue' : ''}`}>{shortDate(task.due)}</span>}
          {project && (
            <span className="card-project">
              {project.emoji} {project.name || 'Untitled'}
            </span>
          )}
          {task.tags.map((t) => (
            <span key={t} className="pill tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

function SortableCard({ task, project, onOpen }: { task: Task; project?: Project; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      onClick={() => onOpen(task.id)}
      {...attributes}
      {...listeners}
    >
      <Card task={task} project={project} />
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <button className="col-add" onClick={() => setEditing(true)}>
        <Icon name="plus" size={14} /> New
      </button>
    );
  return (
    <input
      className="card quick-input"
      autoFocus
      placeholder="Type a name, press Enter"
      onKeyDown={(e) => {
        const value = e.currentTarget.value.trim();
        if (e.key === 'Enter' && value) {
          onAdd(value);
          e.currentTarget.value = '';
        } else if (e.key === 'Escape') setEditing(false);
      }}
      onBlur={(e) => {
        if (e.currentTarget.value.trim()) onAdd(e.currentTarget.value.trim());
        setEditing(false);
      }}
    />
  );
}

function Column({
  status,
  label,
  tasks,
  projects,
  highlight,
  onOpen,
  onAdd,
}: {
  status: Status;
  label: string;
  tasks: Task[];
  projects?: Map<string, Project>;
  highlight: boolean;
  onOpen: (id: string) => void;
  onAdd: (title: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `col:${status}` });
  return (
    <section className={`column col-${status} ${highlight ? 'over' : ''}`}>
      <header className="col-head">
        <span className={`pill status-${status}`}>
          <span className="dot" />
          {label}
        </span>
        <span className="col-count">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="col-list">
          {tasks.map((t) => (
            <SortableCard
              key={t.id}
              task={t}
              project={t.projectId ? projects?.get(t.projectId) : undefined}
              onOpen={onOpen}
            />
          ))}
          <QuickAdd onAdd={onAdd} />
        </div>
      </SortableContext>
    </section>
  );
}

/** projectId undefined = all tasks (with a project filter), string = one project's board. */
export function Board({ projectId }: { projectId?: string }) {
  const tasks = useTasks();
  const projects = useProjects() ?? [];
  const [, setParams] = useSearchParams();
  const [filter, setFilter] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);

  const scope = projectId ?? (filter || null);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const columns = useMemo(() => {
    const visible = (tasks ?? []).filter((t) => !scope || t.projectId === scope);
    return Object.fromEntries(
      STATUSES.map((s) => [s.id, visible.filter((t) => t.status === s.id).sort((a, b) => a.order - b.order)]),
    ) as Record<Status, Task[]>;
  }, [tasks, scope]);
  const byId = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const statusOf = (overId: string) =>
    overId.startsWith('col:') ? (overId.slice(4) as Status) : byId.get(overId)?.status ?? null;

  const onDragOver = ({ over }: DragOverEvent) => setOverStatus(over ? statusOf(String(over.id)) : null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverStatus(null);
    const task = byId.get(String(active.id));
    if (!task || !over || over.id === active.id) return;
    const overId = String(over.id);
    const status = statusOf(overId);
    if (!status) return;
    const without = columns[status].filter((t) => t.id !== task.id);
    let index = without.length;
    if (!overId.startsWith('col:')) index = columns[status].findIndex((t) => t.id === overId);
    patch('task', task.id, { status, order: between(without[index - 1]?.order, without[index]?.order) });
  };

  const add = (status: Status) => (title: string) => {
    const list = columns[status];
    create('task', {
      title,
      status,
      priority: null,
      due: null,
      tags: [],
      projectId: scope,
      body: null,
      order: (list[list.length - 1]?.order ?? 0) + 1,
    });
  };

  const open = (id: string) => setParams({ t: id });
  const active = activeId ? byId.get(activeId) : undefined;
  const mobile = useMobile();

  if (!tasks) return null;
  if (mobile)
    return (
      <div className="board-wrap">
        {projectId === undefined && (
          <div className="board-head">
            <h1 className="page-title">Tasks</h1>
          </div>
        )}
        <TaskList
          columns={columns}
          projectId={scope}
          projects={projectId === undefined ? projectMap : undefined}
          onOpen={open}
        />
      </div>
    );
  return (
    <div className="board-wrap">
      {projectId === undefined && (
        <div className="board-head">
          <h1 className="page-title">Tasks</h1>
          {projects.length > 0 && (
            <select className="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name || 'Untitled'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverStatus(null);
        }}
      >
        <div className="board">
          {STATUSES.map((s) => (
            <Column
              key={s.id}
              status={s.id}
              label={s.label}
              tasks={columns[s.id]}
              projects={projectId === undefined ? projectMap : undefined}
              highlight={!!active && overStatus === s.id && active.status !== s.id}
              onOpen={open}
              onAdd={add(s.id)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
          {active && <Card task={active} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
