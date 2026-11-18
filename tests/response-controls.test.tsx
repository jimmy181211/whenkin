import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';
import AvailabilityStatus from '../App/frontend/components/AvailabilityStatus';
import {
  setLanguage,
  t,
} from '../App/frontend/i18n/index';

afterEach(
  /* Restore English after response-control rendering tests. */
  () => setLanguage('en'),
);
/** Group the participant response status checks. */
describe('participant response status', () => {
  /**
   * Starts without claiming that an untouched response is saved or
   * unsaved.
   */
  it('starts without claiming that an untouched response is saved or unsaved', () => {
    const html = renderToStaticMarkup(
      <AvailabilityStatus state="saved" hasSavedResponse={false} />,
    );
    expect(html).toContain('Not Started');
    expect(html).not.toMatch(/Saved|Unsaved|lucide-check/);
  });
  /** Keeps draft, pending, and failed writes unsaved until confirmation. */
  it('keeps draft, pending, and failed writes unsaved until confirmation', () => {
    for (const state of [
      'dirty',
      'saving',
      'error',
    ] as const) {
      for (const hasSavedResponse of [
        false,
        true,
      ]) {
        const html = renderToStaticMarkup(
          <AvailabilityStatus
            state={state}
            hasSavedResponse={hasSavedResponse}
          />,
        );
        expect(html).toContain('Unsaved');
        expect(html).not.toContain('Saved');
        expect(html).toContain(`aria-busy="${state === 'saving'}"`);
      }
    }
  });
  /** Shows a confirmed response as saved in every supported language. */
  it('shows a confirmed response as saved in every supported language', () => {
    for (const language of [
      'en',
      'zh',
      'es',
    ] as const) {
      setLanguage(language);
      const html = renderToStaticMarkup(
        <AvailabilityStatus state="saved" hasSavedResponse />,
      );
      expect(html).toContain(t('Saved'));
      expect(html).toContain('lucide-check');
    }
  });
});
