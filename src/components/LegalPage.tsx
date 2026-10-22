import React from 'react';
import PageLink from './PageLink';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { getLanguage, getLocale, t } from '../lib/i18n';
import { LEGAL, legalDocuments, type LegalKind } from '../lib/legal';

function Paragraph({ text }: { text: string }) {
  return <p>{text.split(LEGAL.email).map((part, index) => <React.Fragment key={index}>{index > 0 && <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>}{part}</React.Fragment>)}</p>;
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const document = legalDocuments[getLanguage()][kind];
  const otherKind = kind === 'terms' ? 'privacy' : 'terms';
  return <main className="legal-page">
    <PageLink className="text-button legal-back" href="/"><ArrowLeft size={16}/>{t('Back to Whenkin')}</PageLink>
    <article className="legal-card" aria-labelledby="legal-title">
      <header className="legal-heading"><p className="eyebrow">WHENKIN</p><h1 id="legal-title">{document.title}</h1><p className="legal-summary">{document.summary}</p><div className="legal-meta"><span>{LEGAL.operator}</span><span>{t('Effective Date')}: <time dateTime={LEGAL.updated}>{new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${LEGAL.updated}T00:00:00Z`))}</time></span></div></header>
      <details className="legal-contents"><summary>{t('On This Page')}</summary><ol>{document.sections.map((section, index) => <li key={section.title}><a href={`#${kind}-${index + 1}`}>{section.title}</a></li>)}</ol></details>
      <div className="legal-body">{document.sections.map((section, index) => <section id={`${kind}-${index + 1}`} key={section.title} aria-labelledby={`${kind}-heading-${index + 1}`}><h2 id={`${kind}-heading-${index + 1}`}>{section.title}</h2>{section.paragraphs.map(text => <Paragraph text={text} key={text}/>)}</section>)}</div>
      {kind === 'privacy' && <section className="legal-provider-links" aria-labelledby="providers-title"><h2 id="providers-title">{t('Provider Information')}</h2><a href="https://openai.com/policies/privacy-policy/">OpenAI</a><a href="https://neon.com/privacy-policy">Neon</a></section>}
      <div className="legal-contact"><Mail size={20} aria-hidden="true"/><div><strong>{t('Contact Us')}</strong><a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></div></div>
      <a className="text-button legal-other" href={`/${otherKind}`}>{legalDocuments[getLanguage()][otherKind].title}<ArrowRight size={16}/></a>
    </article>
  </main>;
}
