import { useLayoutEffect, useRef } from 'react';

/** Uncontrolled so async DB round-trips never move the caret. */
export function AutoTitle({
  value,
  placeholder,
  autoFocus,
  onChange,
}: {
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, []);
  return (
    <textarea
      ref={ref}
      className="title-input"
      rows={1}
      defaultValue={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onInput={fit}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (document.querySelector('.bn-editor') as HTMLElement | null)?.focus();
        }
      }}
    />
  );
}
