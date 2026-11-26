/** Shared legal-document types, operator details, and language selection. */
import { enLegalDocuments } from './legal-en';
import { zhLegalDocuments } from './legal-zh';
import type { Language } from '../i18n/LanguageProvider';

export const LEGAL = {
  operator: 'UCSD CSSA',
  country: 'United States',
  email: 'j4ouyang@ucsd.edu',
  updated: '2026-11-24',
} as const;
/** Identifies which legal document the page should display. */
export type LegalKind = 'terms' | 'privacy';
/** A legal document section with a heading and ordered paragraphs. */
type Section = { title: string; paragraphs: string[] };
/** Localized legal content used by the terms and privacy pages. */
export type LegalDocument = { title: string; summary: string; sections: Section[] };

export const legalDocuments: Record<Language, Record<LegalKind, LegalDocument>> = {
  en: enLegalDocuments,
  zh: zhLegalDocuments,
};
