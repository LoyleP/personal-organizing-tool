import type { Status } from '../db';

export function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  return (
    <svg className={`status-icon si-${status}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {status === 'doing' && <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />}
        </>
      )}
    </svg>
  );
}
