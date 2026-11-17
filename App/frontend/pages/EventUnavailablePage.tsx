import { CalendarClock } from 'lucide-react';
import PageLink from '../components/PageLink';
import { t } from '../i18n/index';
import './event-unavailable.css';
import EventLimits from '../components/EventLimits';

export default function EventUnavailablePage({
  reason,
}: {
  reason: 'expired' | 'missing';
}) {
  return (
    <main className="event-unavailable-page">
      <section
        className="event-unavailable-card"
        aria-labelledby="event-unavailable-title"
      >
        <span className="event-unavailable-icon" aria-hidden="true">
          <CalendarClock size={27} />
        </span>
        <h1 id="event-unavailable-title">
          {t(
            reason === 'expired'
              ? 'This event link has expired.'
              : 'This event has expired or could not be found.',
          )}
        </h1>
        <EventLimits variant="validity" />
        <p>{t('Expired events and their responses may be removed.')}</p>
        {reason === 'missing' && (
          <p>
            {t('Check the link with your organizer, or create a new event.')}
          </p>
        )}
        <PageLink href="/" className="button primary">
          {t('Create an Event')}
        </PageLink>
        <p className="event-unavailable-policy">
          {t('For details about data retention, see our policies.')}
        </p>
        <nav aria-label={t('Legal Information')}>
          <PageLink href="/terms">{t('Terms of Use')}</PageLink>
          <PageLink href="/privacy">{t('Privacy Policy')}</PageLink>
        </nav>
      </section>
    </main>
  );
}
