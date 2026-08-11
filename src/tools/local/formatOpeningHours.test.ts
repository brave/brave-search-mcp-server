import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOpeningHours } from './index.js';
import type { DayOpeningHours, OpeningHours } from './types.js';

const day = (full_name: string, opens: string, closes: string): DayOpeningHours => ({
  abbr_name: full_name.slice(0, 3),
  full_name,
  opens,
  closes,
});

/**
 * Captured from a real `/res/v1/local/pois` response (Zuni Café, San Francisco).
 * Exercises the two properties that matter most in production payloads:
 *   - `current_day` holding two intervals (lunch service and dinner service)
 *   - `days` being an array-of-arrays, where a day may hold multiple intervals
 * Note that `days` excludes whichever day is reported as `current_day`, and
 * omits closed days entirely (Zuni Café is closed Mondays).
 */
const splitServiceHours: OpeningHours = {
  current_day: [day('Friday', '11:00', '15:00'), day('Friday', '17:00', '21:30')],
  days: [
    [day('Tuesday', '17:00', '21:30')],
    [day('Wednesday', '17:00', '21:30')],
    [day('Thursday', '17:00', '21:30')],
    [day('Saturday', '11:00', '15:00'), day('Saturday', '17:00', '21:30')],
    [day('Sunday', '11:00', '15:00'), day('Sunday', '17:00', '21:30')],
  ],
};

describe('formatOpeningHours', () => {
  it('formats a real split-service payload', () => {
    assert.deepEqual(formatOpeningHours(splitServiceHours), {
      'today (friday)': '11:00-15:00, 17:00-21:30',
      tuesday: '17:00-21:30',
      wednesday: '17:00-21:30',
      thursday: '17:00-21:30',
      saturday: '11:00-15:00, 17:00-21:30',
      sunday: '11:00-15:00, 17:00-21:30',
    });
  });

  it('labels the current day distinctly from the rest of the week', () => {
    const result = formatOpeningHours(splitServiceHours)!;

    assert.ok('today (friday)' in result, 'current day should be labelled "today (<day>)"');
    assert.ok(!('friday' in result), 'current day should not also appear under its bare name');
  });

  it('lowercases day names supplied in title case', () => {
    const result = formatOpeningHours({
      current_day: [day('Monday', '09:00', '17:00')],
      days: [[day('Tuesday', '09:00', '17:00')]],
    })!;

    assert.deepEqual(Object.keys(result), ['today (monday)', 'tuesday']);
  });

  it('joins multiple intervals for the same day with a comma', () => {
    const result = formatOpeningHours({
      current_day: [day('Monday', '09:00', '12:00')],
      days: [[day('Tuesday', '09:00', '12:00'), day('Tuesday', '13:00', '17:00')]],
    })!;

    assert.equal(result.tuesday, '09:00-12:00, 13:00-17:00');
  });

  it('accepts a flat `days` array as well as an array of arrays', () => {
    // `OpeningHours['days']` is typed as `DayOpeningHours[] | DayOpeningHours[][]`,
    // so both shapes must produce the same result.
    const nested = formatOpeningHours(splitServiceHours);
    const flat = formatOpeningHours({
      current_day: splitServiceHours.current_day,
      days: (splitServiceHours.days as DayOpeningHours[][]).flat(),
    });

    assert.deepEqual(flat, nested);
  });

  it('preserves the order in which days are returned by the API', () => {
    const result = formatOpeningHours(splitServiceHours)!;

    assert.deepEqual(Object.keys(result), [
      'today (friday)',
      'tuesday',
      'wednesday',
      'thursday',
      'saturday',
      'sunday',
    ]);
  });

  describe('when data is missing', () => {
    it('returns undefined when opening hours are absent', () => {
      assert.equal(formatOpeningHours(undefined), undefined);
    });

    it('returns undefined for an empty opening hours object', () => {
      // Both `current_day` and `days` are optional on the API type, so `{}` is
      // a legal payload and must not throw.
      assert.equal(formatOpeningHours({}), undefined);
    });

    it('omits the current day when `current_day` is absent', () => {
      const result = formatOpeningHours({ days: splitServiceHours.days })!;

      assert.ok(!Object.keys(result).some((key) => key.startsWith('today')));
      assert.equal(result.tuesday, '17:00-21:30');
    });

    it('omits the current day when `current_day` is an empty array', () => {
      const result = formatOpeningHours({ current_day: [], days: splitServiceHours.days })!;

      assert.ok(!Object.keys(result).some((key) => key.startsWith('today')));
      assert.equal(result.saturday, '11:00-15:00, 17:00-21:30');
    });

    it('returns only the current day when `days` is absent', () => {
      assert.deepEqual(formatOpeningHours({ current_day: splitServiceHours.current_day }), {
        'today (friday)': '11:00-15:00, 17:00-21:30',
      });
    });
  });
});
