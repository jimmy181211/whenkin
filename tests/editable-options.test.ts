import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  exactOption,
  matchingOptions,
} from '../App/frontend/utils/editable-options';

const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat('en', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, index, 1))),
}));
const years = Array.from({ length: 25 }, (_, index) => ({
  value: String(2026 + index),
  label: String(2026 + index),
}));
describe('editable calendar options', () => {
  it('offers January first for J and supports complete case-insensitive month names', () => {
    expect(matchingOptions(months, 'J').map((option) => option.label)).toEqual([
      'January',
      'June',
      'July',
    ]);
    expect(exactOption(months, ' november ')?.value).toBe('11');
    expect(exactOption(months, 'Not a month')).toBeUndefined();
  });
  it('accepts only allowed years, rejecting malformed and out-of-range values', () => {
    for (const year of [
      '2026',
      '2027',
      '2028',
      '2050',
    ]) {
      expect(exactOption(years, year)?.value).toBe(year);
    }
    for (const year of [
      '2022',
      '2051',
      '202x',
      '2027.0',
      '-2027',
      '202700',
    ]) {
      expect(exactOption(years, year)).toBeUndefined();
    }
    expect(matchingOptions(years, '202').map((option) => option.value)).toEqual(
      [
        '2026',
        '2027',
        '2028',
        '2029',
      ],
    );
  });
  it('allows English month input with localized display labels', () => {
    expect(
      matchingOptions(
        [
          {
            value: '1',
            label: '一月',
            keywords: ['January'],
          },
        ],
        'J',
      )[0].value,
    ).toBe('1');
    expect(
      exactOption(
        [
          {
            value: '11',
            label: 'noviembre',
            keywords: ['November'],
          },
        ],
        'November',
      )?.value,
    ).toBe('11');
    expect(
      matchingOptions(
        [
          {
            value: '1',
            label: 'enero',
            keywords: ['January'],
          },
          {
            value: '6',
            label: 'junio',
            keywords: ['June'],
          },
        ],
        'j',
      )[0].value,
    ).toBe('6');
  });
});
