import { useEffect, useState } from 'react';
import { Route, Switch, useLocation, useSearchParams } from 'wouter';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { TaskPeek } from './components/TaskPeek';
import { NotePage } from './components/NotePage';
import { ProjectPage } from './components/ProjectPage';
import { CommandPalette } from './components/CommandPalette';
import { Browse } from './components/Browse';
import { MobileNav } from './components/MobileNav';
import { newTask } from './store';
import { Topbar } from './components/Topbar';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function App() {
  const [params, setParams] = useSearchParams();
  const [location] = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const peekId = params.get('t');

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) {
        e.preventDefault();
        const task = await newTask(location.match(/^\/p\/([^/]+)/)?.[1] ?? null);
        setParams({ t: task.id });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [location, setParams]);

  return (
    <div className="app">
      <Sidebar onSearch={() => setPaletteOpen(true)} />
      <main className="main">
        <Switch>
          <Route path="/">
            <Topbar crumbs={['Tasks']} />
            <Board />
          </Route>
          <Route path="/browse">
            <Topbar crumbs={['Browse']} />
            <Browse />
          </Route>
          <Route path="/p/:id">{({ id }) => <ProjectPage id={id} />}</Route>
          <Route path="/n/:id">{({ id }) => <NotePage key={id} id={id} />}</Route>
          <Route>
            <Topbar crumbs={['Not found']} back="/" />
          </Route>
        </Switch>
      </main>
      <MobileNav onSearch={() => setPaletteOpen(true)} />
      {peekId && <TaskPeek key={peekId} id={peekId} onClose={() => setParams({})} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
