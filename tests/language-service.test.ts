/** Checks service methods, React callbacks, storage failures, and subscriptions. */
import {
  afterEach,
  expect,
  it,
  vi,
} from 'vitest';
import {
  LanguageService,
  langService,
} from '../App/frontend/i18n/language';

/** Restore browser globals and spies after each isolated service test. */
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Install local storage and browser events without using the real browser.
 * @returns The saved preference map, event target, and listener registration spies.
 */
function installBrowser(saved = 'en') {
  const values = new Map([[
    'whenkin:language',
    saved,
  ]]);
  const target = new EventTarget();
  vi.stubGlobal('window', target);
  vi.stubGlobal('localStorage', {
    /** Read a saved preference from the fixture. */
    getItem: (key: string) => values.get(key) ?? null,
    /** Persist a preference only in this fixture. */
    setItem: (key: string, value: string) => values.set(key, value),
  });
  return {
    values,
    target,
    add: vi.spyOn(target, 'addEventListener'),
    remove: vi.spyOn(target, 'removeEventListener'),
  };
}

/** Deliver a storage event after changing the fixture's saved preference. */
function storageEvent(target: EventTarget, key = 'whenkin:language') {
  target.dispatchEvent(Object.assign(new Event('storage'), { key }));
}

/** Public operations belong to the class rather than separate function exports. */
it('exposes ordinary methods through one shared service instance', async () => {
  const exports = await import('../App/frontend/i18n/language');
  expect(langService).toBeInstanceOf(LanguageService);
  expect(Object.hasOwn(LanguageService.prototype, 'setLanguage')).toBe(true);
  for (const name of [
    'getLanguage',
    'getLocale',
    'setLanguage',
    'subscribeLanguage',
    'isLanguage',
    't',
    'languageService',
  ]) {
    expect(Object.hasOwn(exports, name)).toBe(false);
  }
});

/** A new service reads storage without installing listeners or changing shared state. */
it('initializes independently and calls ordinary instance methods', () => {
  const browser = installBrowser('zh');
  const service = new LanguageService();
  expect(browser.add).not.toHaveBeenCalled();
  expect(service.getLanguage()).toBe('zh');
  expect(service.getLocale()).toBe('zh-CN');
  expect(service.t('Language')).toBe('语言');
  expect(service.t('Hello {name}', { name: 'Sam' })).toBe('Hello Sam');
  expect(service.t('Hello {name}')).toBe('Hello {name}');
  service.setLanguage('en');
  expect(service.getLanguage()).toBe('en');
  expect(browser.values.get('whenkin:language')).toBe('en');
  expect(new LanguageService().getLanguage()).toBe('en');
});

/** React passes these methods as callbacks, without the service receiver. */
it('keeps React subscription and snapshot callbacks bound and stable', () => {
  const browser = installBrowser();
  const service = new LanguageService();
  const subscribe = service.subscribe;
  const readSnapshot = service.getLanguage;
  const changed = vi.fn();
  const unsubscribe = subscribe(changed);
  service.setLanguage('zh');
  expect(readSnapshot()).toBe('zh');
  expect(changed).toHaveBeenCalledOnce();
  expect(service.subscribe).toBe(subscribe);
  expect(service.getLanguage).toBe(readSnapshot);
  unsubscribe();
  expect(browser.remove).toHaveBeenCalledOnce();
});

/** Blocked browser storage must not prevent in-memory changes or React notifications. */
it('keeps language changes working when storage is unavailable', () => {
  vi.stubGlobal('localStorage', {
    /** Simulate a browser that refuses storage reads. */
    getItem: () => {
      throw new Error('Blocked');
    },
    /** Simulate a browser that refuses storage writes. */
    setItem: () => {
      throw new Error('Blocked');
    },
  });
  const service = new LanguageService();
  const changed = vi.fn();
  const unsubscribe = service.subscribe(changed);
  expect(service.getLanguage()).toBe('en');
  service.setLanguage('zh');
  service.setLanguage('zh');
  expect(service.getLanguage()).toBe('zh');
  expect(changed).toHaveBeenCalledTimes(1);
  unsubscribe();
  service.setLanguage('en');
  expect(changed).toHaveBeenCalledTimes(1);
});

/** One browser listener serves every subscriber and is removed after the last cleanup. */
it('shares cross-tab listening and ignores unrelated or unchanged storage events', () => {
  const browser = installBrowser();
  const service = new LanguageService();
  const first = vi.fn();
  const second = vi.fn();
  const unsubscribeFirst = service.subscribe(first);
  const unsubscribeSecond = service.subscribe(second);
  expect(browser.add).toHaveBeenCalledTimes(1);
  browser.values.set('whenkin:language', 'zh');
  storageEvent(browser.target, 'another-key');
  expect(service.getLanguage()).toBe('en');
  storageEvent(browser.target);
  storageEvent(browser.target);
  expect(service.getLanguage()).toBe('zh');
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  unsubscribeFirst();
  expect(browser.remove).not.toHaveBeenCalled();
  unsubscribeSecond();
  expect(browser.remove).toHaveBeenCalledTimes(1);
  browser.values.set('whenkin:language', 'en');
  storageEvent(browser.target);
  expect(service.getLanguage()).toBe('zh');
});

/** Invalid saved preferences fall back to English instead of entering service state. */
it('rejects unsupported saved language codes', () => {
  installBrowser('fr');
  const service = new LanguageService();
  expect(service.getLanguage()).toBe('en');
  expect(service.isLanguage('zh')).toBe(true);
  expect(service.isLanguage('fr')).toBe(false);
  expect(service.isLanguage('toString')).toBe(false);
});
