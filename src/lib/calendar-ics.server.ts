import { createServerFn } from '@tanstack/react-start';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO with offset, e.g. "2026-05-17T09:00:00-03:00"
  end: string;
  isAllDay: boolean;
  url: string;     // opens in Google Calendar
  description?: string;
  location?: string;
}

// ── ICS parser ───────────────────────────────────────────────────────────────

function unfold(text: string): string {
  // RFC 5545: continuation lines start with SPACE or TAB
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
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return { iso: `${y}-${mo}-${d}T00:00:00-03:00`, isAllDay: true };
  }

  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const h = raw.slice(9, 11);
  const mi = raw.slice(11, 13);
  const s = raw.slice(13, 15) || '00';

  if (raw.endsWith('Z')) {
    return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}Z`, isAllDay: false };
  }

  // Local time — treat as Brasília (-03:00) for this personal app
  // (Brazil abolished DST in 2019, always UTC-3)
  void tzid; // acknowledged — Brasília is the assumed timezone
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}-03:00`, isAllDay: false };
}

function extractProp(lines: string[], key: string): { value: string; params: Record<string, string> } | null {
  for (const line of lines) {
    // Match KEY, KEY;PARAM=VAL, KEY;PARAM=VAL;PARAM2=VAL2
    if (!line.startsWith(key)) continue;
    const rest = line.slice(key.length);
    if (rest[0] !== ':' && rest[0] !== ';') continue;

    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) continue;

    const paramStr = rest.slice(0, colonIdx);
    const value = rest.slice(colonIdx + 1);

    const params: Record<string, string> = {};
    paramStr.replace(/;([^=]+)=([^;]+)/g, (_, pk, pv) => {
      params[pk.toUpperCase()] = pv;
      return '';
    });

    return { value: value.trim(), params };
  }
  return null;
}

function parseIcs(text: string, filterDate: string): CalendarEvent[] {
  const unfolded = unfold(text);
  const events: CalendarEvent[] = [];

  const blocks = unfolded.split(/\r?\n/).reduce<string[][]>((acc, line) => {
    if (line === 'BEGIN:VEVENT') { acc.push([]); }
    else if (acc.length > 0) { acc[acc.length - 1].push(line); }
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

    // Filter: compare the date part in Brasília timezone
    const startDate = new Date(startIso).toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    });
    if (startDate !== filterDate) continue;

    // Build Google Calendar link — prefer URL from ICS, else open day view
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

// ── Server function ───────────────────────────────────────────────────────────

function getIcsUrl(): string {
  // Try multiple env sources: process.env (Node/dev), import.meta.env (Vite/CF)
  if (typeof process !== 'undefined' && process.env?.['GOOGLE_CALENDAR_ICS_URL']) {
    return process.env['GOOGLE_CALENDAR_ICS_URL'];
  }
  // @ts-expect-error -- Vite/CF Workers env
  if (typeof import.meta !== 'undefined' && import.meta.env?.['GOOGLE_CALENDAR_ICS_URL']) {
    // @ts-expect-error
    return import.meta.env['GOOGLE_CALENDAR_ICS_URL'] as string;
  }
  return '';
}

export const fetchCalendarEvents = createServerFn({ method: 'GET' })
  .validator((d: unknown) => d as { date: string })
  .handler(async ({ data }) => {
    const icsUrl = getIcsUrl();
    if (!icsUrl) {
      console.warn('[DayCalendar] GOOGLE_CALENDAR_ICS_URL not set');
      return [] as CalendarEvent[];
    }

    try {
      const res = await fetch(icsUrl, {
        headers: { 'User-Agent': 'PedroHQ/1.0', 'Accept': 'text/calendar' },
      });
      if (!res.ok) {
        console.warn('[DayCalendar] ICS fetch failed:', res.status);
        return [] as CalendarEvent[];
      }
      const text = await res.text();
      return parseIcs(text, data.date);
    } catch (err) {
      console.error('[DayCalendar] ICS error:', err);
      return [] as CalendarEvent[];
    }
  });
