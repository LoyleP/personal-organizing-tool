import { useEffect, useState } from 'react';
import { Route, Switch, useLocation, useSearchParams } from 'wouter';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { TaskPeek } from './components/TaskPeek';
import { NotePage } from './components/NotePage';
import { ProjectPage } from './components/ProjectPage';
import { CommandPalette } from './components/CommandPalette';
import { create, useTasks } from './store';
import { Topbar } from './components/Topbar';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function App() {
  const [params, setParams] = useSearchParams();
  const [location] = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const tasks = useTasks();
  const peekId = params.get('t');

  useEffect(() => setNavOpen(false), [location]);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) {
        e.preventDefault();
        const projectId = location.match(/^\/p\/([^/]+)/)?.[1] ?? null;
        const top = (tasks ?? []).filter((t) => t.status === 'todo').reduce((m, t) => Math.min(m, t.order), 1);
        const task = await create('task', {
          title: '',
          status: 'todo',
          priority: null,
          due: null,
          tags: [],
          projectId,
          body: null,
          order: top - 1,
        });
        setParams({ t: task.id });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [location, tasks, setParams]);

  return (
    <div className="app" data-nav={navOpen ? 'open' : undefined}>
      <Sidebar onSearch={() => setPaletteOpen(true)} />
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <main className="main">
        <Switch>
          <Route path="/">
            <Topbar crumbs={['Tasks']} onMenu={() => setNavOpen(true)} />
            <Board />
          </Route>
          <Route path="/p/:id">{({ id }) => <ProjectPage id={id} onMenu={() => setNavOpen(true)} />}</Route>
          <Route path="/n/:id">{({ id }) => <NotePage key={id} id={id} onMenu={() => setNavOpen(true)} />}</Route>
          <Route>
            <Topbar crumbs={['Not found']} onMenu={() => setNavOpen(true)} />
          </Route>
        </Switch>
      </main>
      {peekId && <TaskPeek key={peekId} id={peekId} onClose={() => setParams({})} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
