import { useLanguage } from '../i18n/LanguageProvider';
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LEGAL, legalDocuments, type LegalKind } from '../content/legal';
import EventLimits from '../components/EventLimits';

/**
 * Legal-text rendering component that inserts live retention wording and
 * contact links.
 * @returns A paragraph with retention placeholders resolved and email
 * addresses linked.
 */
function Paragraph({ text }: { text: string }) {
  return (
    <p>
      {text.split('{retention}').map(
        /**
         * @returns A legal-text fragment preceded by the live retention
         * duration where required.
         */
        (part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <EventLimits variant="duration" />}
            {part.split(LEGAL.email).map(
              /**
               * @returns A text fragment with a linked contact address
               * inserted between email-separated parts.
               */
              (text, emailIndex) => (
                <React.Fragment key={emailIndex}>
                  {emailIndex > 0 && <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>}
                  {text}
                </React.Fragment>
              ),
            )}
          </React.Fragment>
        ),
      )}
    </p>
  );
}

/**
 * Localized terms/privacy page component with section navigation.
 * @returns The chosen legal document, its contents links, and navigation to
 * the other policy.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, locale, language } = useLanguage();
  const document = legalDocuments[language][kind];
  const otherKind = kind === 'terms' ? 'privacy' : 'terms';
  return (
    <main className="legal-page">
      <a className="text-button legal-back" href="/">
        <ArrowLeft size={16} />
        {t('Back to Whenkin')}
      </a>
      <article className="legal-card" aria-labelledby="legal-title">
        <header className="legal-heading">
          <h1 id="legal-title">{document.title}</h1>
          <p className="legal-summary">{document.summary}</p>
          <div className="legal-meta">
            <span>{LEGAL.operator}</span>
            <span>
              {t('Effective Date')}:{' '}
              <time dateTime={LEGAL.updated}>
                {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                  new Date(`${LEGAL.updated}T00:00:00Z`),
                )}
              </time>
            </span>
          </div>
        </header>
        <details className="legal-contents">
          <summary>{t('On This Page')}</summary>
          <ol>
            {document.sections.map(
              /**
               * @returns A contents-list link to the corresponding legal
               * section.
               */
              (section, index) => (
                <li key={section.title}>
                  <a href={`#${kind}-${index + 1}`}>{section.title}</a>
                </li>
              ),
            )}
          </ol>
        </details>
        <div className="legal-body">
          {document.sections.map(
            /**
             * @returns A legal section with its heading and rendered
             * paragraphs.
             */
            (section, index) => (
              <section
                id={`${kind}-${index + 1}`}
                key={section.title}
                aria-labelledby={`${kind}-heading-${index + 1}`}
              >
                <h2 id={`${kind}-heading-${index + 1}`}>{section.title}</h2>
                {section.paragraphs.map(
                  /**
                   * @returns One legal paragraph with shared retention and
                   * email-link rendering.
                   */
                  (text) => (
                    <Paragraph text={text} key={text} />
                  ),
                )}
              </section>
            ),
          )}
        </div>
        {kind === 'privacy' && (
          <section className="legal-provider-links" aria-labelledby="providers-title">
            <h2 id="providers-title">{t('Provider Information')}</h2>
            <a href="https://openai.com/policies/privacy-policy/">OpenAI</a>
            <a href="https://neon.com/privacy-policy">Neon</a>
          </section>
        )}
        <a className="text-button legal-other" href={`/${otherKind}`}>
          {legalDocuments[language][otherKind].title}
          <ArrowRight size={16} />
        </a>
      </article>
    </main>
  );
}
