import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import App from '../App/frontend/App';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';
import {
  langService,
  languageOptions,
  messages,
} from '../App/frontend/i18n/language';
import {
  LEGAL,
  legalDocuments,
} from '../App/frontend/content/legal';
import {
  exactOption,
  matchingOptions,
} from '../App/frontend/utils/editable-options';
import {
  shortcutCopy,
  shortcutDevices,
} from '../App/frontend/utils/shortcut-instructions';
import {
  allSlots,
  gridModel,
  localToUTC,
  slotsToRanges,
} from '../App/frontend/utils/time';
import type { MeetingEvent } from '../App/shared/types';

afterEach(
  /* Reset the language and browser globals after each localization test. */
  () => {
    langService.setLanguage('en');
    vi.unstubAllGlobals();
  },
);

/**
 * Render a requested route with a mobile-sized browser fixture.
 * @returns Static HTML for the requested page after installing the mobile window fixture.
 */
const page = (path = '/') => {
  vi.stubGlobal('window', {
    location: {
      pathname: path,
      href: 'http://localhost' + path,
      origin: 'http://localhost',
    },
    innerWidth: 390,
  });
  return renderToStaticMarkup(<App />);
};

/** Group the language changes across the website checks. */
describe('language changes across the website', () => {
  /** Starts in English with a compact guide entry on every screen. */
  it('starts in English with a compact guide entry on every screen', () => {
    expect(langService.getLanguage()).toBe('en');
    const html = page();
    expect(html).toContain('Event Name');
    expect(html).toContain('Add a Shortcut');
    expect(html).not.toContain('What are you planning?');
    expect(html).not.toContain('The Organizer Creates an Event');
    expect(html).not.toContain('Participants Mark When They’re Free');
    expect(html).not.toContain('Whenkin Suggests the Best Times');
    expect(html).not.toMatch(/href="\/demo"|Try an example|Try the demo/);
    expect(html).toContain('href="/how-it-works"');
    expect(page('/how-it-works')).toContain('The Organizer Creates an Event');
    expect(html).toMatch(/autoComplete="off" required=""/);
    expect(html).not.toContain('autoComplete="given-name"');
    expect(html).not.toContain('Your Name');
    expect(page('/e/855e5518-3b5a-49cb-b906-69bbd7bac603')).toMatch(
      /<nav[^>]*>[\s\S]*?New Event[\s\S]*?English/,
    );
  });
  /** Renders Chinese forms, instructions, and the selected language. */
  it('renders Chinese forms, instructions, and the selected language', () => {
    langService.setLanguage('zh');
    const html = page();
    expect(html).toContain('创建你的活动');
    expect(html).toContain('添加快捷方式');
    expect(html).not.toContain('组织者创建活动');
    expect(html).not.toContain('参与者标记空闲时间');
    expect(html).toContain('value="zh" selected=""');
    expect(html).not.toContain('What are you planning?');
    expect(page('/how-it-works')).toContain('guide-page');
    expect(langService.getLocale()).toBe('zh-CN');
  });
  /**
   * Includes every interface key and preserves substitution placeholders
   * in Chinese.
   */
  it('includes every interface key and preserves substitution placeholders in Chinese', () => {
    /**
     * Extract placeholder tokens so translations preserve the same
     * replacements.
     * @returns The sorted placeholder tokens, or an empty list if the message has none.
     */
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    for (const language of ['zh'] as const) {
      for (const [source, translated] of Object.entries(messages)) {
        expect(translated.trim(), `${language}: ${source}`).not.toBe('');
        expect(placeholders(translated), `${language}: ${source}`).toEqual(placeholders(source));
      }
      for (const device of shortcutDevices) {
        expect(shortcutCopy[language].devices[device]).toBeTruthy();
        expect(shortcutCopy[language].steps[device]).toHaveLength(3);
      }
      for (const kind of [
        'terms',
        'privacy',
      ] as const) {
        expect(legalDocuments[language][kind].sections).toHaveLength(
          legalDocuments.en[kind].sections.length,
        );
      }
      const privacy = JSON.stringify(legalDocuments[language].privacy);
      expect(privacy.match(/\{retention\}/g)).toHaveLength(2);
    }
  });

  /** Retired saved preferences fall back to English instead of breaking rendering. */
  it('offers only English and Chinese and safely loads retired preferences', async () => {
    expect(languageOptions.map(({ value }) => value)).toEqual([
      'en',
      'zh',
    ]);
    for (const retired of [
      'es',
      'pt',
      'de',
    ]) {
      expect(langService.isLanguage(retired)).toBe(false);
      vi.stubGlobal('localStorage', { getItem: () => retired });
      vi.resetModules();
      const fresh = await import('../App/frontend/i18n/language');
      expect(fresh.langService.getLanguage()).toBe('en');
      expect(fresh.langService.t('Event Name')).toBe('Event Name');
    }
  });

  /** Typed month suggestions preserve numeric month values in both supported locales. */
  it('matches typed English and Chinese months', () => {
    for (const [locale, query, expected] of [
      [
        'en-US',
        'jan',
        '1',
      ],
      [
        'zh-CN',
        '三',
        '3',
      ],
    ]) {
      const months = Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: new Intl.DateTimeFormat(locale, {
          month: 'long',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(2000, index, 1))),
      }));
      expect(matchingOptions(months, query)[0].value).toBe(expected);
      expect(exactOption(months, expected)?.value).toBe(expected);
    }
    for (const invalid of [
      'toString',
      '__proto__',
      'pt-PT',
      null,
    ]) {
      expect(langService.isLanguage(invalid)).toBe(false);
    }
  });

  /** Does not expose a demo route. */
  it('does not expose a demo route', () => {
    const html = page('/demo');
    expect(html).toContain('That Page Is a Little Off-Grid.');
    expect(html).not.toContain('availability-section');
  });
  /** Preserves typed text when translating templates. */
  it('preserves typed text when translating templates', () => {
    langService.setLanguage('zh');
    expect(langService.t('ORGANIZED BY {name}', { name: 'Ana & 李' })).toBe('组织者：Ana & 李');
  });
  /** Remembers the explicit language preference on this device. */
  it('remembers the explicit language preference on this device', () => {
    const storage = { setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    langService.setLanguage('zh');
    expect(storage.setItem).toHaveBeenCalledWith('whenkin:language', 'zh');
  });

  /** One storage event must notify each component once, not once per subscriber. */
  it('shares one cross-tab listener and removes it after the last unsubscribe', () => {
    const browser = new EventTarget();
    const add = vi.spyOn(browser, 'addEventListener');
    const remove = vi.spyOn(browser, 'removeEventListener');
    vi.stubGlobal('window', browser);
    vi.stubGlobal('localStorage', {
      getItem: () => 'zh',
      setItem: vi.fn(),
    });
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = langService.subscribe(first);
    const stopSecond = langService.subscribe(second);

    /** Simulate another tab updating a specific storage key. */
    const storageChange = (key: string) => {
      const event = new Event('storage');
      Object.defineProperty(event, 'key', { value: key });
      browser.dispatchEvent(event);
    };

    try {
      expect(add).toHaveBeenCalledTimes(1);
      storageChange('unrelated');
      expect(first).not.toHaveBeenCalled();
      storageChange('whenkin:language');
      expect(langService.getLanguage()).toBe('zh');
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
      storageChange('whenkin:language');
      expect(first).toHaveBeenCalledTimes(1);
      stopFirst();
      expect(remove).not.toHaveBeenCalled();
      langService.setLanguage('en');
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(2);
    } finally {
      stopFirst();
      stopSecond();
    }
    expect(remove).toHaveBeenCalledTimes(1);
  });

  /** Switching and translation still work when the browser blocks storage. */
  it('switches without storage and preserves unknown keys and placeholders', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Storage blocked');
      },
    });
    langService.setLanguage('zh');
    expect(langService.t('Event Name')).toBe('活动名称');
    expect(langService.t('Untranslated {value}')).toBe('Untranslated {value}');
    expect(langService.t('Untranslated {value}', { value: 1234 })).toBe('Untranslated 1,234');
  });
  /**
   * Offers policy links from home and event pages and localizes both
   * documents.
   */
  it('offers policy links from home and event pages and localizes both documents', () => {
    const titles = {
      en: [
        'Terms of Use',
        'Privacy Policy',
      ],
      zh: [
        '使用条款',
        '隐私政策',
      ],
    };
    for (const { value: language } of languageOptions) {
      langService.setLanguage(language);
      for (const path of [
        '/',
        '/e/855e5518-3b5a-49cb-b906-69bbd7bac603',
      ]) {
        const html = page(path);
        expect(html).toContain('href="/terms"');
        expect(html).toContain('href="/privacy"');
      }
      for (const [index, path] of [
        '/terms',
        '/privacy',
      ].entries()) {
        const html = page(path);
        expect(html).toContain(`<h1 id="legal-title">${titles[language][index]}</h1>`);
        expect(html).toContain('UCSD CSSA');
        expect(html).toContain('href="mailto:j4ouyang@ucsd.edu"');
        expect(html).toContain(`<time dateTime="${LEGAL.updated}"`);
        expect(html).not.toContain('create-submit');
        expect(html).not.toContain('That Page Is a Little Off-Grid.');
      }
    }
  });
});
/** Group the language is independent of scheduling data checks. */
describe('language is independent of scheduling data', () => {
  /** Keeps selected instants and UTC ranges unchanged in every language. */
  it('keeps selected instants and UTC ranges unchanged in every language', () => {
    vi.stubGlobal('window', { innerWidth: 390 });
    const start = localToUTC('2027-01-15', '10:00', 'America/Los_Angeles');
    const event: MeetingEvent = {
      id: 'test',
      title: '原文 / texto original',
      description: '',
      organizer_name: 'Ana',
      timezone: 'America/Los_Angeles',
      windows: [
        {
          start,
          end: '2027-01-15T19:00:00Z',
        },
      ],
      responses: [],
    };
    const selected = new Set(allSlots(event.windows).slice(0, 2));
    const before = slotsToRanges(selected);
    for (const { value: language } of languageOptions) {
      langService.setLanguage(language);
      const html = renderToStaticMarkup(
        <AvailabilityGrid
          event={event}
          zone="America/New_York"
          selected={selected}
          onChange={
            /* Leave calendar selections unchanged during language-rendering checks. */
            () => {}
          }
        />,
      );
      expect((html.match(/aria-pressed="true" class="time-cell/g) || []).length).toBe(1);
      expect(slotsToRanges(selected)).toEqual(before);
      expect(
        gridModel(event.windows, 'America/New_York').days[0][1].map(
          /** Compare stored instants after rendering in another timezone. */
          (c) => c.stamp,
        ),
      ).toEqual(allSlots(event.windows));
    }
  });
});
