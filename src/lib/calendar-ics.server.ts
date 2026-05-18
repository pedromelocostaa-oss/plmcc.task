// Re-export CalendarEvent type for components that import from here.
// The actual data fetching moved to calendar-api.ts (plain HTTP endpoint).
export type { CalendarEvent } from './calendar-api';
