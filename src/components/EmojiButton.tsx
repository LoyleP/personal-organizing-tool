import { useEffect, useRef, useState } from 'react';

const EMOJIS =
  '📄 📝 📁 📌 ⭐️ 💡 🎯 🚀 🧠 📚 🗂️ 🗓️ ✅ 🔥 🌱 🎨 💼 🏠 💪 🧪 🛠️ 💰 ✈️ 🎓 🎵 📷 ❤️ 🌍 🧩 ⚡️ 🍀 🔒'.split(' ');

export function EmojiButton({ value, onChange, size = 'lg' }: { value: string; onChange: (e: string) => void; size?: 'lg' | 'sm' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    addEventListener('pointerdown', close);
    return () => removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="emoji" ref={ref}>
      <button className={`emoji-btn emoji-${size}`} onClick={() => setOpen(!open)} aria-label="Change icon">
        {value}
      </button>
      {open && (
        <div className="popover emoji-grid">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
