import { DAVClient, type DAVCalendar } from 'tsdav';
import type { Change } from './db.js';
import { parseEvents, taskIcs } from './ics.js';

const { APPLE_ID, APPLE_APP_PASSWORD, CALDAV_TASK_CALENDAR } = process.env;

export const calendarConfigured = () => !!(APPLE_ID && APPLE_APP_PASSWORD);

const auth = () => 'Basic ' + Buffer.from(`${APPLE_ID}:${APPLE_APP_PASSWORD}`).toString('base64');
const nameOf = (c: DAVCalendar) => (typeof c.displayName === 'string' ? c.displayName : '');

let session: Promise<{ client: DAVClient; calendars: DAVCalendar[] }> | null = null;

function connect() {
  session ??= (async () => {
    const client = new DAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: APPLE_ID, password: APPLE_APP_PASSWORD },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();
    const calendars = (await client.fetchCalendars()).filter(
      (c) => !c.components || c.components.includes('VEVENT'),
    );
    return { client, calendars };
  })().catch((e) => {
    session = null;
    throw e;
  });
  return session;
}

export async function listEvents(start: string, end: string) {
  const { client, calendars } = await connect();
  const perCalendar = await Promise.all(
    calendars.map(async (cal) => {
      const objects = await client.fetchCalendarObjects({
        calendar: cal,
        timeRange: { start, end },
        expand: true,
      });
      const color = typeof cal.calendarColor === 'string' ? cal.calendarColor.slice(0, 7) : '#2383e2';
      return objects.flatMap((o) =>
        parseEvents(o.data ?? '').map((e) => ({ ...e, calendar: nameOf(cal), color })),
      );
    }),
  );
  return perCalendar.flat();
}

async function taskCalendar() {
  const { calendars } = await connect();
  return (CALDAV_TASK_CALENDAR && calendars.find((c) => nameOf(c) === CALDAV_TASK_CALENDAR)) || calendars[0];
}

/** Mirrors tasks with a due date into iCloud as all-day events. */
export async function pushTaskEvents(
  changes: Change[],
  previous: Map<string, { data: Record<string, any>; deleted: boolean }>,
  origin: string,
) {
  const cal = await taskCalendar();
  if (!cal) return;
  await Promise.allSettled(
    changes.map(async (c) => {
      const t = c.data;
      const prev = previous.get(c.id);
      const url = new URL(`pot-task-${c.id}.ics`, cal.url).href;
      const prevHad = !!prev && !prev.deleted && !!prev.data.due;
      if (c.deleted || !t.due) {
        if (prevHad) await fetch(url, { method: 'DELETE', headers: { Authorization: auth() } });
        return;
      }
      if (prevHad && prev.data.due === t.due && prev.data.title === t.title && prev.data.status === t.status) return;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: auth(), 'Content-Type': 'text/calendar; charset=utf-8' },
        body: taskIcs(c.id, { title: t.title, due: t.due, status: t.status }, c.updatedAt, `${origin}/?t=${c.id}`),
      });
      if (!res.ok) console.error('CalDAV PUT failed', res.status, await res.text());
    }),
  );
}
