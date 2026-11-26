/** Isolated SSR fixtures choose a provider language without global app state. */
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import {
  LanguageProvider,
  getLocale,
  isLanguage,
  translate,
  type Language,
} from '../../App/frontend/i18n/LanguageProvider';

/**
 * Keep each test file's requested initial language separate from other fixtures.
 * This selects SSR input only; interactive state is owned by LanguageProvider.
 * @returns A fixture with localized rendering and matching expected-text helpers.
 */
export function createLanguageFixture() {
  let language: Language = 'en';
  return {
    /** Choose the initial language for subsequent fixture renders. */
    setLanguage(next: Language) {
      language = next;
    },
    /** @returns The fixture's requested initial language. */
    getLanguage() {
      return language;
    },
    /** @returns The locale used to calculate this fixture's expected text. */
    getLocale() {
      return getLocale(language);
    },
    isLanguage,
    /** @returns Expected translated text for the chosen initial language. */
    t(message: string, values?: Record<string, string | number>) {
      return translate(language, message, values);
    },
    /** @returns Static markup rendered under its own language provider. */
    render(children: ReactNode) {
      return renderToStaticMarkup(
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>,
      );
    },
  };
}
