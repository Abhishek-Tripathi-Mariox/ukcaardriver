import type { JourneySummary } from '../services/api';

type JourneyTiming = Pick<JourneySummary, 'departureDate' | 'departureTime' | 'status'> & {
  startWindowMinutes?: number;
};

/** Interpret civil dates/times in IST regardless of the phone's timezone. */
function departureMs(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return NaN;
  const calendar = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date) return NaN;
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return NaN;
  return Date.parse(`${date}T${time.padStart(5, '0')}:00+05:30`);
}

export function effectiveJourneyStatus(journey: JourneyTiming, now = Date.now()): JourneySummary['status'] {
  if (journey.status !== 'scheduled') return journey.status;
  const departure = departureMs(journey.departureDate, journey.departureTime);
  const today = new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const missed = Number.isFinite(departure) ? now >= departure : journey.departureDate < today;
  return missed ? 'expired' : 'scheduled';
}

export function journeyStartTiming(journey: JourneyTiming, now = Date.now()) {
  const departure = departureMs(journey.departureDate, journey.departureTime);
  const minutes = journey.startWindowMinutes;
  const windowMinutes = typeof minutes === 'number' && Number.isFinite(minutes) && minutes >= 0 ? minutes : 30;
  const windowOpens = departure - windowMinutes * 60_000;
  let state: 'loading' | 'open' | 'too_early' | 'closed' | 'running' | 'finished';
  if (journey.status === 'active' || journey.status === 'in_progress') state = 'running';
  else if (journey.status === 'completed' || journey.status === 'cancelled') state = 'finished';
  else if (journey.status === 'expired') state = 'closed';
  else if (!Number.isFinite(departure)) state = 'loading';
  else if (now >= departure) state = 'closed';
  else if (now < windowOpens) state = 'too_early';
  else state = 'open';
  return { state, departure, windowOpens };
}

/** Reclassify locally at departure even if a refresh cannot reach the server. */
export function partitionJourneys(journeys: JourneySummary[], now = Date.now()) {
  const unique = new Map(journeys.map(journey => [journey.journeyKey, journey]));
  const upcoming: JourneySummary[] = [];
  const past: JourneySummary[] = [];
  for (const journey of unique.values()) {
    const status = effectiveJourneyStatus(journey, now);
    const item = { ...journey, status };
    (status === 'completed' || status === 'cancelled' || status === 'expired' ? past : upcoming).push(item);
  }
  const order = (a: JourneySummary, b: JourneySummary) =>
    `${a.departureDate} ${a.departureTime}`.localeCompare(`${b.departureDate} ${b.departureTime}`);
  upcoming.sort(order);
  past.sort((a, b) => order(b, a));
  return { upcoming, past };
}
