/** Shared legal-document types, operator details, and language selection. */
import { enLegalDocuments } from './legal-en';
import { zhLegalDocuments } from './legal-zh';
import { esLegalDocuments } from './legal-es';
import { ptLegalDocuments } from './legal-pt';
import { deLegalDocuments } from './legal-de';
import type { Language } from '../i18n/index';

export const LEGAL = {
  operator: 'UCSD CSSA',
  country: 'United States',
  email: 'j4ouyang@ucsd.edu',
  updated: '2026-10-24',
} as const;
export type LegalKind = 'terms' | 'privacy';
type Section = { title: string;
  paragraphs: string[] };
export type LegalDocument = {
  title: string;
  summary: string;
  sections: Section[];
};

export const legalDocuments: Record<
  Language,
  Record<LegalKind, LegalDocument>
> = {
  en: enLegalDocuments,
  zh: zhLegalDocuments,
  es: esLegalDocuments,
  pt: ptLegalDocuments,
  de: deLegalDocuments,
};
