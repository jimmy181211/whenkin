/** @typedef {{ readonly value: number, readonly unit: 'month' }} RetentionPolicy */

/** @param {unknown} value */
export function validateRetentionMonths(value) {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1 || value > 1200) {
    throw new Error('Retention must be a whole number of months from 1 to 1200.');
  }
  return value;
}

/** @param {unknown} input @returns {Readonly<RetentionPolicy>} */
export function parseRetentionPolicy(input) {
  if (!input || typeof input !== 'object' || !('value' in input) || !('unit' in input) || input.unit !== 'month') {
    throw new Error('Invalid retention policy.');
  }
  return Object.freeze({ value: validateRetentionMonths(input.value), unit: 'month' });
}
