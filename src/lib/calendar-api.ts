/**
 * Pure server-side calendar API handler — no createServerFn, no Vite plugin.
 * Called directly from src/server.ts for GET /api/calendar?date=YYYY-MM-DD
 */

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  url: string;
  description?: string;
  location?: string;
}

// ── ICS parser ────────────────────────────────────────────────────────────────

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function decodeText(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\N/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseIcsDatetime(raw: string, tzid?: string): { iso: string; isAllDay: boolean } {
  const isAllDay = raw.length === 8 && !raw.includes('T');
  if (isAllDay) {
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
    return { iso: `${y}-${mo}-${d}T00:00:00-03:00`, isAllDay: true };
  }
  const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
  const h = raw.slice(9, 11), mi = raw.slice(11, 13), s = raw.slice(13, 15) || '00';
  if (raw.endsWith('Z')) return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}Z`, isAllDay: false };
  void tzid;
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}-03:00`, isAllDay: false };
}

function extractProp(lines: string[], key: string) {
  for (const line of lines) {
    if (!line.startsWith(key)) continue;
    const rest = line.slice(key.length);
    if (rest[0] !== ':' && rest[0] !== ';') continue;
    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) continue;
    const paramStr = rest.slice(0, colonIdx);
    const value = rest.slice(colonIdx + 1);
    const params: Record<string, string> = {};
    paramStr.replace(/;([^=]+)=([^;]+)/g, (_, pk, pv) => { params[pk.toUpperCase()] = pv; return ''; });
    return { value: value.trim(), params };
  }
  return null;
}

function parseIcs(text: string, filterDate: string): CalendarEvent[] {
  const unfolded = unfold(text);
  const events: CalendarEvent[] = [];
  const blocks = unfolded.split(/\r?\n/).reduce<string[][]>((acc, line) => {
    if (line === 'BEGIN:VEVENT') acc.push([]);
    else if (acc.length > 0) acc[acc.length - 1].push(line);
    return acc;
  }, []);

  for (const lines of blocks) {
    const endIdx = lines.findIndex((l) => l === 'END:VEVENT');
    const block = endIdx > -1 ? lines.slice(0, endIdx) : lines;

    const dtstart = extractProp(block, 'DTSTART');
    if (!dtstart) continue;
    const dtend = extractProp(block, 'DTEND') ?? dtstart;
    const summary = extractProp(block, 'SUMMARY');
    const uid = extractProp(block, 'UID');
    const url = extractProp(block, 'URL');
    const desc = extractProp(block, 'DESCRIPTION');
    const loc = extractProp(block, 'LOCATION');

    const { iso: startIso, isAllDay } = parseIcsDatetime(dtstart.value, dtstart.params['TZID']);
    const { iso: endIso } = parseIcsDatetime(dtend.value, dtend.params['TZID']);

    const startDate = new Date(startIso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    if (startDate !== filterDate) continue;

    const gcalLink = url?.value
      ? decodeText(url.value)
      : `https://calendar.google.com/calendar/r/day/${filterDate.replace(/-/g, '/')}`;

    events.push({
      id: uid?.value ?? `${startIso}-${Math.random()}`,
      title: summary ? decodeText(summary.value) : '(sem título)',
      start: startIso,
      end: endIso,
      isAllDay,
      url: gcalLink,
      description: desc ? decodeText(desc.value) : undefined,
      location: loc ? decodeText(loc.value) : undefined,
    });
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

// Fallback: the URL is already public in wrangler.jsonc in the repo.
const FALLBACK_ICS_URL =
  'https://calendar.google.com/calendar/ical/pedro.costa%40blisai.com/private-f4601a98da95d608fc4d08e4711664cd/basic.ics';

function getIcsUrl(env: Record<string, string>): string {
  // Cloudflare Workers env bindings
  if (env?.['GOOGLE_CALENDAR_ICS_URL']) return env['GOOGLE_CALENDAR_ICS_URL'];
  // Node / local dev
  if (typeof process !== 'undefined' && process.env?.['GOOGLE_CALENDAR_ICS_URL'])
    return process.env['GOOGLE_CALENDAR_ICS_URL'];
  // Hardcoded fallback so the calendar works even if env var is not injected
  return FALLBACK_ICS_URL;
}

export async function handleCalendarRequest(
  request: Request,
  env: Record<string, string>,
): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: 'date param required (YYYY-MM-DD)' }), {
      status: 400, headers: cors,
    });
  }

  const icsUrl = getIcsUrl(env);
  if (!icsUrl) {
    console.warn('[calendar-api] GOOGLE_CALENDAR_ICS_URL not set');
    return new Response(JSON.stringify([]), { status: 200, headers: cors });
  }

  try {
    const res = await fetch(icsUrl, {
      headers: { 'User-Agent': 'PedroHQ/1.0', Accept: 'text/calendar' },
    });
    if (!res.ok) {
      console.warn('[calendar-api] ICS fetch failed:', res.status);
      return new Response(JSON.stringify([]), { status: 200, headers: cors });
    }
    const text = await res.text();
    const events = parseIcs(text, date);
    return new Response(JSON.stringify(events), { status: 200, headers: cors });
  } catch (err) {
    console.error('[calendar-api] error:', err);
    return new Response(JSON.stringify([]), { status: 200, headers: cors });
  }
}
