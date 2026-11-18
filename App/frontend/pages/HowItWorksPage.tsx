import { ArrowRight } from 'lucide-react';
import Steps from '../components/Steps';
import PageLink from '../components/PageLink';
import { t } from '../i18n/index';

/**
 * Usage-guide page component for the scheduling workflow.
 * @returns The introductory steps with navigation back to event creation.
 */
export default function HowItWorksPage() {
  return (
    <main className="guide-page">
      <PageLink className="text-button" href="/">
        ← {t('Back to Home')}
      </PageLink>
      <section className="guide-card">
        <h1>{t('How It Works')}</h1>
        <Steps />
        <PageLink className="button primary" href="/">
          {t('Create an Event')} <ArrowRight size={17} />
        </PageLink>
      </section>
    </main>
  );
}
