import { languageOptions, messages } from '../App/frontend/i18n/LanguageProvider';

import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App/frontend/App';
import AvailabilityGrid from '../App/frontend/components/AvailabilityGrid';

import { LEGAL, legalDocuments } from '../App/frontend/content/legal';
import { shortcutCopy, shortcutDevices } from '../App/frontend/utils/shortcut-instructions';
import { allSlots, gridModel, localToUTC, slotsToRanges } from '../App/frontend/utils/time';
import type { MeetingEvent } from '../App/shared/types';
import { createLanguageFixture } from './helpers/language';
const languageFixture = createLanguageFixture();
const renderToStaticMarkup = languageFixture.render;

afterEach(
  /* Reset the language and browser globals after each localization test. */
  () => {
    languageFixture.setLanguage('en');
    vi.unstubAllGlobals();
  },
);

/**
 * Render a requested route with a mobile-sized browser fixture.
 * @returns Static HTML for the requested page after installing the mobile window fixture.
 */
const page = (path = '/') => {
  vi.stubGlobal('window', {
    location: { pathname: path, href: 'http://localhost' + path, origin: 'http://localhost' },
    innerWidth: 390,
  });
  return renderToStaticMarkup(<App />);
};

/** Group the language changes across the website checks. */
describe('language changes across the website', () => {
  /** Starts in English with a compact guide entry on every screen. */
  it('starts in English with a compact guide entry on every screen', () => {
    expect(languageFixture.getLanguage()).toBe('en');
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
    languageFixture.setLanguage('zh');
    const html = page();
    expect(html).toContain('创建你的活动');
    expect(html).toContain('添加快捷方式');
    expect(html).not.toContain('组织者创建活动');
    expect(html).not.toContain('参与者标记空闲时间');
    expect(html).toContain('value="zh" selected=""');
    expect(html).not.toContain('What are you planning?');
    expect(page('/how-it-works')).toContain('guide-page');
    expect(languageFixture.getLocale()).toBe('zh-CN');
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
        expect(shortcutCopy[language].tutorial).toBeTruthy();
      }
      for (const kind of ['terms', 'privacy'] as const) {
        expect(legalDocuments[language][kind].sections).toHaveLength(
          legalDocuments.en[kind].sections.length,
        );
      }
      const privacy = JSON.stringify(legalDocuments[language].privacy);
      expect(privacy.match(/\{retention\}/g)).toHaveLength(2);
    }
  });

  /** Only the two supported codes are available as language choices. */
  it('offers only English and Chinese and rejects retired language codes', () => {
    expect(languageOptions.map(({ value }) => value)).toEqual(['en', 'zh']);
    for (const retired of ['es', 'pt', 'de']) {
      expect(languageFixture.isLanguage(retired)).toBe(false);
    }
  });

  /** Reject language-like values that are not supported codes. */
  it('rejects unsupported language values', () => {
    for (const invalid of ['toString', '__proto__', 'pt-PT', null]) {
      expect(languageFixture.isLanguage(invalid)).toBe(false);
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
    languageFixture.setLanguage('zh');
    expect(languageFixture.t('ORGANIZED BY {name}', { name: 'Ana & 李' })).toBe('组织者：Ana & 李');
  });
  /** Switching and translation still work when the browser blocks storage. */
  it('switches without storage and preserves unknown keys and placeholders', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Storage blocked');
      },
    });
    languageFixture.setLanguage('zh');
    expect(languageFixture.t('Event Name')).toBe('活动名称');
    expect(languageFixture.t('Untranslated {value}')).toBe('Untranslated {value}');
    expect(languageFixture.t('Untranslated {value}', { value: 1234 })).toBe('Untranslated 1,234');
  });
  /**
   * Offers policy links from home and event pages and localizes both
   * documents.
   */
  it('offers policy links from home and event pages and localizes both documents', () => {
    const titles = { en: ['Terms of Use', 'Privacy Policy'], zh: ['使用条款', '隐私政策'] };
    for (const { value: language } of languageOptions) {
      languageFixture.setLanguage(language);
      for (const path of ['/', '/e/855e5518-3b5a-49cb-b906-69bbd7bac603']) {
        const html = page(path);
        expect(html).toContain('href="/terms"');
        expect(html).toContain('href="/privacy"');
      }
      for (const [index, path] of ['/terms', '/privacy'].entries()) {
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
      windows: [{ start, end: '2027-01-15T19:00:00Z' }],
      responses: [],
    };
    const selected = new Set(allSlots(event.windows).slice(0, 2));
    const before = slotsToRanges(selected);
    for (const { value: language } of languageOptions) {
      languageFixture.setLanguage(language);
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
