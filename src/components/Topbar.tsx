import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Topbar({ crumbs, onMenu, children }: { crumbs: ReactNode[]; onMenu: () => void; children?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open sidebar">
        <Icon name="menu" />
      </button>
      <nav className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="crumb-sep">/</span>}
            {c}
          </span>
        ))}
      </nav>
      <div className="topbar-actions">{children}</div>
    </header>
  );
}
