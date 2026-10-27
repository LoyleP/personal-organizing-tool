import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'wouter';
import { db, type Task } from '../db';
import { create, patch, today, useTasks } from '../store';
import { Icon } from './Icon';

interface CalEvent {
  uid: string;
  title: string;
  allDay: boolean;
  start: string | number;
  end: string | number | null;
  lastModified: number | null;
  calendar: string;
  color: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (v: string | number) => (typeof v === 'string' ? v : iso(new Date(v)));
const TASK_UID = 'pot-task-';

function useEvents(start: Date, end: Date) {
  const key = `cal:${iso(start)}`;
  const [state, setState] = useState<{ events: CalEvent[]; configured: boolean; error?: string }>({ events: [], configured: true });

  useEffect(() => {
    let live = true;
    db.meta.get(key).then((cached) => live && cached && setState(cached.value));
    fetch(`/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((r) => (r.ok || r.status === 502 ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body) => {
        if (!live) return;
        if (body.error) return setState((s) => ({ ...s, error: body.error }));
        setState(body);
        db.meta.put({ key, value: body });
      })
      .catch(() => live && setState((s) => ({ ...s, error: "Can't reach iCloud right now" })));
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

export default function CalendarView() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [, setParams] = useSearchParams();
  const [adding, setAdding] = useState<string | null>(null);
  const tasks = useTasks() ?? [];

  const days = useMemo(() => {
    const first = new Date(month);
    first.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [month]);
  const { events, configured, error } = useEvents(days[0], days[41]);

  // Two-way: a task event moved in Apple Calendar moves the task's due date.
  useEffect(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const e of events) {
      if (!e.uid.startsWith(TASK_UID) || !e.allDay || !e.lastModified) continue;
      const t = byId.get(e.uid.slice(TASK_UID.length));
      if (t && t.due && t.due !== e.start && e.lastModified > t.updatedAt + 1000) patch('task', t.id, { due: e.start as string });
    }
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; events: CalEvent[] }>();
    const slot = (d: string) => map.get(d) ?? (map.set(d, { tasks: [], events: [] }), map.get(d)!);
    for (const t of tasks) if (t.due) slot(t.due).tasks.push(t);
    for (const e of events) if (!e.uid.startsWith(TASK_UID)) slot(dayOf(e.start)).events.push(e);
    for (const v of map.values()) v.events.sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || +new Date(a.start) - +new Date(b.start));
    return map;
  }, [tasks, events]);

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const now = today();
  const weekdays = days.slice(0, 7).map((d) => d.toLocaleDateString(undefined, { weekday: 'short' }));

  return (
    <div className="calendar-wrap">
      <div className="board-head">
        <h1 className="page-title">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1>
        <div className="cal-nav">
          {(error || !configured) && <span className="muted small">{configured ? error : 'iCloud not connected'}</span>}
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="left" />
          </button>
          <button
            className="btn"
            onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          >
            Today
          </button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <Icon name="right" />
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {weekdays.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const slot = byDay.get(key);
          return (
            <div
              key={key}
              className={`cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === now ? 'today' : ''}`}
              onClick={(e) => e.target === e.currentTarget && setAdding(key)}
            >
              <span className="cal-date" onClick={() => setAdding(key)}>
                {d.getDate()}
              </span>
              {slot?.events.map((e) => (
                <div key={e.uid + e.start} className="cal-event" title={`${e.title} · ${e.calendar}`}>
                  <span className="dot" style={{ background: e.color }} />
                  {!e.allDay && (
                    <span className="muted">
                      {new Date(e.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className="truncate">{e.title}</span>
                </div>
              ))}
              {slot?.tasks.map((t) => (
                <button key={t.id} className={`cal-task ${t.status === 'done' ? 'done' : ''}`} onClick={() => setParams({ t: t.id })}>
                  <span className={`check status-${t.status}`} />
                  <span className="truncate">{t.title || 'Untitled'}</span>
                </button>
              ))}
              {adding === key && (
                <input
                  className="cal-input"
                  autoFocus
                  placeholder="New task"
                  onKeyDown={(e) => {
                    const title = e.currentTarget.value.trim();
                    if (e.key === 'Enter' && title) {
                      create('task', { title, status: 'todo', priority: null, due: key, tags: [], projectId: null, body: null, order: 0 });
                      setAdding(null);
                    } else if (e.key === 'Escape') setAdding(null);
                  }}
                  onBlur={() => setAdding(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
