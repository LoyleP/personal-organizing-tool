import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Icon } from './Icon';

/** Breadcrumbs on desktop; on phones a round back button plus round actions, Linear-style. */
export function Topbar({ crumbs, back, children }: { crumbs: ReactNode[]; back?: string; children?: ReactNode }) {
  return (
    <header className="topbar">
      {back && (
        <Link href={back} className="icon-btn back-btn" aria-label="Back">
          <Icon name="left" />
        </Link>
      )}
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
