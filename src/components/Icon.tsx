const paths = {
  board: 'M3 4h4v12H3zM8 4h4v8H8zM13 4h4v5h-4z',
  note: 'M5 3h7l3 3v11H5zM12 3v3h3M8 10h5M8 13h5',
  search: 'M9 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM13 13l4 4',
  plus: 'M10 4v12M4 10h12',
  chevron: 'M8 6l4 4-4 4',
  left: 'M12 5l-5 5 5 5',
  close: 'M5 5l10 10M15 5L5 15',
  menu: 'M3 6h14M3 10h14M3 14h14',
  trash: 'M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11',
  folder: 'M3 5h5l2 2h7v9H3z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
