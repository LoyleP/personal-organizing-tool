import { useSyncExternalStore } from 'react';

const query = matchMedia('(max-width: 760px)');

export const useMobile = () =>
  useSyncExternalStore(
    (l) => (query.addEventListener('change', l), () => query.removeEventListener('change', l)),
    () => query.matches,
  );
