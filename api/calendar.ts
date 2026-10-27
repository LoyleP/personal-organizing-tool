import { calendarConfigured, listEvents } from './_lib/caldav.js';

export async function GET(req: Request) {
  if (!calendarConfigured()) return Response.json({ configured: false, events: [] });
  const params = new URL(req.url).searchParams;
  const start = params.get('start');
  const end = params.get('end');
  if (!start || !end) return Response.json({ error: 'start and end are required' }, { status: 400 });
  try {
    const events = await listEvents(start, end);
    return Response.json({ configured: true, events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return Response.json({ configured: true, error: 'Could not reach iCloud' }, { status: 502 });
  }
}
