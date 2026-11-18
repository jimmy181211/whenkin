import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  detectShortcutDevice,
  shortcutPageURL,
} from '../App/frontend/utils/shortcut-instructions';

/** Group the shortcut instructions checks. */
describe('shortcut instructions', () => {
  /**
   * Check each browser/device signature against its expected instruction
   * category.
   */
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/140.0 Mobile',
      5,
      'ios',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1',
      5,
      'ios',
    ],
    [
      'Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36',
      5,
      'android',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36',
      0,
      'chrome',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36 Edg/140.0',
      0,
      'edge',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1',
      0,
      'mac',
    ],
  ] as const)(
    'chooses device instructions for %s',

    (agent, touch, expected) => {
      expect(detectShortcutDevice(agent, touch)).toBe(expected);
    },
  );
  /**
   * Keeps the current event path while excluding edit tokens and
   * fragments.
   */
  it('keeps the current event path while excluding edit tokens and fragments', () => {
    expect(
      shortcutPageURL('https://whenkin.example/e/test?token=private#response'),
    ).toBe('https://whenkin.example/e/test');
    expect(shortcutPageURL('https://whenkin.example/')).toBe(
      'https://whenkin.example/',
    );
  });
});
