import type { JourneySummary } from '../../services/api';
import { effectiveJourneyStatus, journeyStartTiming, partitionJourneys } from '../journeyTiming';

const journey = (key = 'trip', override: Partial<JourneySummary> = {}): JourneySummary => ({
  journeyKey: key, departureDate: '2026-10-21', departureTime: '09:00',
  status: 'scheduled', startWindowMinutes: 30, ...override,
} as JourneySummary);
const at = (time: string) => Date.parse(`2026-10-21T${time}+05:30`);

describe('journey start deadline on the phone', () => {
  test.each([
    ['08:29:59.999', 'too_early'], ['08:30:00.000', 'open'],
    ['08:59:59.999', 'open'], ['09:00:00.000', 'closed'], ['17:00:00.000', 'closed'],
  ])('09:00 journey at %s -> %s', (now, state) => {
    expect(journeyStartTiming(journey(), at(now)).state).toBe(state);
  });

  test('a 00:10 IST journey can start at 23:40 the previous day', () => {
    expect(journeyStartTiming(journey('midnight', { departureDate: '2026-10-22', departureTime: '00:10' }), at('23:40:00')).state).toBe('open');
    expect(journeyStartTiming(journey('midnight', { departureDate: '2026-10-22', departureTime: '00:10' }), Date.parse('2026-10-21T18:40:00Z')).state).toBe('closed');
  });

  test.each(['active', 'in_progress'] as const)('%s journeys remain resumable after departure', status => {
    expect(journeyStartTiming(journey('running', { status }), Date.parse('2026-10-22T00:30:00+05:30')).state).toBe('running');
  });

  test.each(['completed', 'cancelled'] as const)('%s trips cannot be restarted', status => {
    expect(journeyStartTiming(journey('finished', { status }), at('08:45:00')).state).toBe('finished');
  });

  test.each([
    { departureTime: '' }, { departureDate: '' }, { departureDate: '2026-02-31' },
    { departureTime: '24:00' }, { departureTime: '09:60' },
  ])('unknown/invalid timing cannot enable Start: %j', override => {
    expect(journeyStartTiming(journey('invalid', override), at('08:45:00')).state).toBe('loading');
  });

  test('the route-configured start window is honored', () => {
    expect(journeyStartTiming(journey('custom', { startWindowMinutes: 10 }), at('08:49:59')).state).toBe('too_early');
    expect(journeyStartTiming(journey('custom', { startWindowMinutes: 10 }), at('08:50:00')).state).toBe('open');
  });
});

describe('local Upcoming and Past lists', () => {
  test('a loaded trip moves to Past at departure even with no network refresh', () => {
    const cached = [journey()];
    expect(partitionJourneys(cached, at('08:59:59')).upcoming).toHaveLength(1);
    const after = partitionJourneys(cached, at('09:00:00'));
    expect(after.upcoming).toHaveLength(0);
    expect(after.past[0].status).toBe('expired');
    expect(cached[0].status).toBe('scheduled');
  });

  test('running trips cross midnight in Upcoming, while terminal trips remain Past', () => {
    const items = [journey('active', { status: 'active' }), journey('on-road', { status: 'in_progress' }), journey('completed', { status: 'completed' }), journey('cancelled', { status: 'cancelled' })];
    const result = partitionJourneys(items, Date.parse('2026-10-22T00:15:00+05:30'));
    expect(result.upcoming.map(j => j.journeyKey)).toEqual(['active', 'on-road']);
    expect(result.past.map(j => j.journeyKey)).toEqual(['completed', 'cancelled']);
  });

  test('separate list requests straddling departure do not duplicate a trip', () => {
    const result = partitionJourneys([journey(), journey('trip', { status: 'expired' })], at('09:00:00'));
    expect(result.past).toHaveLength(1);
    expect(result.upcoming).toHaveLength(0);
  });

  test('missed past trips sort newest first and future trips sort earliest first', () => {
    const result = partitionJourneys([journey('later', { departureTime: '12:00' }), journey('old', { departureTime: '07:00' }), journey('soon', { departureTime: '11:00' }), journey('recent')], at('10:00:00'));
    expect(result.upcoming.map(j => j.journeyKey)).toEqual(['soon', 'later']);
    expect(result.past.map(j => j.journeyKey)).toEqual(['recent', 'old']);
    expect(effectiveJourneyStatus(journey('legacy', { departureDate: '2026-10-20', departureTime: '' }), at('10:00:00'))).toBe('expired');
  });
});
