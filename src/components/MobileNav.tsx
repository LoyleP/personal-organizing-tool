import { Link, useLocation, useSearchParams } from 'wouter';
import { newNote, newTask } from '../store';
import { Icon } from './Icon';

/** Floating tab bar + create button, shown on phones only (see CSS). */
export function MobileNav({ onSearch }: { onSearch: () => void }) {
  const [location, navigate] = useLocation();
  const [params, setParams] = useSearchParams();
  if (location.startsWith('/n/')) return null;

  const projectId = location.match(/^\/p\/([^/]+)/)?.[1] ?? null;
  const notesContext = location === '/browse' || (projectId && params.get('view') === 'notes');

  const createItem = async () => {
    if (notesContext) navigate(`/n/${(await newNote(projectId)).id}`);
    else setParams({ t: (await newTask(projectId)).id });
  };

  return (
    <div className="mobile-nav">
      <nav className="tabbar">
        <Link href="/" className={location === '/' ? 'active' : ''}>
          <Icon name="board" size={20} />
          <span>Tasks</span>
        </Link>
        <Link href="/browse" className={location === '/browse' || location.startsWith('/p/') ? 'active' : ''}>
          <Icon name="folder" size={20} />
          <span>Browse</span>
        </Link>
        <button onClick={onSearch}>
          <Icon name="search" size={20} />
          <span>Search</span>
        </button>
      </nav>
      <button className="fab" onClick={createItem} aria-label={notesContext ? 'New note' : 'New task'}>
        <Icon name="plus" size={22} />
      </button>
    </div>
  );
}
