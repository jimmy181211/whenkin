import { CalendarClock } from 'lucide-react';
import { langService } from '../i18n/language';
import './event-unavailable.css';
import EventLimits from '../components/EventLimits';

/**
 * Recovery page component for an expired or missing event link. Missing
 * records may have been cleaned up, so do not claim expiry is certain.
 * @returns An explanation with a create-event action and retention-policy
 * links.
 */
export default function EventUnavailablePage({ reason }: { reason: 'expired' | 'missing' }) {
  return (
    <main className="event-unavailable-page">
      <section className="event-unavailable-card" aria-labelledby="event-unavailable-title">
        <span className="event-unavailable-icon" aria-hidden="true">
          <CalendarClock size={27} />
        </span>
        <h1 id="event-unavailable-title">
          {langService.t(
            reason === 'expired'
              ? 'This event link has expired.'
              : 'This event has expired or could not be found.',
          )}
        </h1>
        <EventLimits variant="validity" />
        <p>{langService.t('Expired events and their responses may be removed.')}</p>
        {reason === 'missing' && (
          <p>{langService.t('Check the link with your organizer, or create a new event.')}</p>
        )}
        <a href="/" className="button primary">
          {langService.t('Create an Event')}
        </a>
        <p className="event-unavailable-policy">
          {langService.t('For details about data retention, see our policies.')}
        </p>
        <nav aria-label={langService.t('Legal Information')}>
          <a href="/terms">{langService.t('Terms of Use')}</a>
          <a href="/privacy">{langService.t('Privacy Policy')}</a>
        </nav>
      </section>
    </main>
  );
}
