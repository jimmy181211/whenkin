import { useLanguage } from '../i18n/LanguageProvider';
import { ArrowRight } from 'lucide-react';
import Steps from '../components/Steps';

/**
 * Usage-guide page component for the scheduling workflow.
 * @returns The introductory steps with navigation back to event creation.
 */
export default function HowItWorksPage() {
  const { t } = useLanguage();
  return (
    <main className="guide-page">
      <a className="text-button" href="/">
        ← {t('Back to Home')}
      </a>
      <section className="guide-card">
        <h1>{t('How It Works')}</h1>
        <Steps />
        <a className="button primary" href="/">
          {t('Create an Event')} <ArrowRight size={17} />
        </a>
      </section>
    </main>
  );
}
