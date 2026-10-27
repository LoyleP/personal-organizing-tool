export interface CalEvent {
  uid: string;
  title: string;
  allDay: boolean;
  /** YYYY-MM-DD for all-day events, epoch ms otherwise */
  start: string | number;
  end: string | number | null;
  lastModified: number | null;
}

const unescape = (v: string) =>
  v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
const escape = (v: string) =>
  v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function tzOffset(ts: number, tz: string) {
  try {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
        .formatToParts(ts)
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts;
  } catch {
    return 0;
  }
}

function parseDate(value: string, params: Record<string, string>): { allDay: boolean; v: string | number } {
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    return { allDay: true, v: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return { allDay: false, v: Date.parse(value) };
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  if (m[7] || !params.TZID) return { allDay: false, v: guess };
  const off = tzOffset(guess, params.TZID);
  let t = guess - off;
  const off2 = tzOffset(t, params.TZID);
  if (off2 !== off) t = guess - off2;
  return { allDay: false, v: t };
}

export function parseEvents(ics: string): CalEvent[] {
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: CalEvent[] = [];
  let cur: Record<string, { value: string; params: Record<string, string> }> | null = null;
  let depth = 0;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      depth = 0;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('BEGIN:')) depth++;
    else if (line === 'END:VEVENT') {
      if (cur.DTSTART) {
        const s = parseDate(cur.DTSTART.value, cur.DTSTART.params);
        const e = cur.DTEND ? parseDate(cur.DTEND.value, cur.DTEND.params) : null;
        const lm = cur['LAST-MODIFIED'] ?? cur.DTSTAMP;
        events.push({
          uid: cur.UID?.value ?? '',
          title: unescape(cur.SUMMARY?.value ?? '(No title)'),
          allDay: s.allDay,
          start: s.v,
          end: e?.v ?? null,
          lastModified: lm ? (parseDate(lm.value, lm.params).v as number) : null,
        });
      }
      cur = null;
    } else if (line.startsWith('END:')) depth--;
    else if (depth === 0) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const [name, ...rawParams] = line.slice(0, colon).split(';');
      const params = Object.fromEntries(
        rawParams.map((p) => {
          const [k, v = ''] = p.split('=');
          return [k.toUpperCase(), v.replace(/^"|"$/g, '')];
        }),
      );
      cur[name.toUpperCase()] = { value: line.slice(colon + 1), params };
    }
  }
  return events;
}

const stamp = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
const day = (iso: string) => iso.replace(/-/g, '');

export function taskIcs(
  id: string,
  t: { title: string; due: string; status: string },
  updatedAt: number,
  link: string,
) {
  const next = new Date(`${t.due}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const title = (t.status === 'done' ? '✓ ' : '') + (t.title || 'Untitled task');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//personal-organizing-tool//EN',
    'BEGIN:VEVENT',
    `UID:pot-task-${id}`,
    `DTSTAMP:${stamp(updatedAt)}`,
    `LAST-MODIFIED:${stamp(updatedAt)}`,
    `DTSTART;VALUE=DATE:${day(t.due)}`,
    `DTEND;VALUE=DATE:${day(next.toISOString().slice(0, 10))}`,
    `SUMMARY:${escape(title)}`,
    `URL:${link}`,
    `DESCRIPTION:${escape(link)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
