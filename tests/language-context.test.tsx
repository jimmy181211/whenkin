/** Checks language initialization, dictionary behavior, and isolated React providers. */
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LanguageProvider,
  useLanguage,
  getLocale,
  isLanguage,
  translate,
} from '../App/frontend/i18n/LanguageProvider';

/** Restore browser fixtures after each language test. */
afterEach(() => vi.unstubAllGlobals());

/**
 * Consume context like a real UI component, including translated text and locale.
 * @returns A compact status line identifying the provider's current language.
 */
function LanguageStatus() {
  const { language, locale, t } = useLanguage();
  return (
    <span>
      {language}|{locale}|{t('Event Name')}
    </span>
  );
}

/** Old browser preferences are ignored; every ordinary app entry starts in English. */
it('starts in English without reading old browser preferences', () => {
  const getItem = vi.fn(() => 'zh');
  vi.stubGlobal('localStorage', { getItem });
  const html = renderToStaticMarkup(
    <LanguageProvider>
      <LanguageStatus />
    </LanguageProvider>,
  );
  expect(html).toBe('<span>en|en-US|Event Name</span>');
  expect(getItem).not.toHaveBeenCalled();
});

/** Localized rendering does not save the selected language to browser storage. */
it('renders a selected language without saving a preference', () => {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  expect(
    renderToStaticMarkup(
      <LanguageProvider initialLanguage="zh">
        <LanguageStatus />
      </LanguageProvider>,
    ),
  ).toBe('<span>zh|zh-CN|活动名称</span>');
  expect(setItem).not.toHaveBeenCalled();
});

/** Dictionary lookup keeps fallback keys, user content, and unresolved tokens intact. */
it('translates explicitly without mutable language state', () => {
  expect(translate('zh', 'Event Name')).toBe('活动名称');
  expect(translate('en', 'Event Name')).toBe('Event Name');
  expect(translate('zh', 'Hello {name}', { name: 'Ana & 李' })).toBe('Hello Ana & 李');
  expect(translate('zh', 'Hello {name}')).toBe('Hello {name}');
  expect(translate('zh', '{count}', { count: 1234 })).toBe('1,234');
  expect(getLocale('zh')).toBe('zh-CN');
  expect(isLanguage('__proto__')).toBe(false);
});

/** Each app tree owns its language, including nested or simultaneous renders. */
it('keeps providers independent without adding a DOM wrapper', () => {
  const html = renderToStaticMarkup(
    <LanguageProvider initialLanguage="en">
      <LanguageStatus />
      <LanguageProvider initialLanguage="zh">
        <LanguageStatus />
      </LanguageProvider>
      <LanguageStatus />
    </LanguageProvider>,
  );
  expect(html).toBe(
    '<span>en|en-US|Event Name</span><span>zh|zh-CN|活动名称</span><span>en|en-US|Event Name</span>',
  );
});

/** A new provider does not inherit language from an earlier independent page. */
it('resets a newly opened app to English', () => {
  renderToStaticMarkup(
    <LanguageProvider initialLanguage="zh">
      <LanguageStatus />
    </LanguageProvider>,
  );
  expect(
    renderToStaticMarkup(
      <LanguageProvider>
        <LanguageStatus />
      </LanguageProvider>,
    ),
  ).toBe('<span>en|en-US|Event Name</span>');
});

/** Missing provider boundaries should fail clearly rather than silently showing English. */
it('explains a missing provider to developers', () => {
  expect(() => renderToStaticMarkup(<LanguageStatus />)).toThrow(
    'useLanguage must be used inside LanguageProvider',
  );
});
