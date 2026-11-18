import {
  CalendarDays,
  Check,
  Users,
} from 'lucide-react';
import { t } from '../i18n/index';
const steps = [
  {
    title: 'The Organizer Creates an Event',
    short: 'Choose possible dates and hours, then share the link.',
    icon: CalendarDays,
  },
  {
    title: 'Participants Mark When They’re Free',
    short: 'Open the link and drag across the time grid. No account needed.',
    icon: Users,
  },
  {
    title: 'Whenkin Suggests the Best Times',
    short: 'We compare availability. The organizer shares the chosen time.',
    icon: Check,
  },
];

/**
 * Compact introduction component describing the scheduling workflow.
 * @returns A translated, numbered list of the three introductory steps.
 */
export default function Steps() {
  return (
    <div className="how-it-works">
      <p className="eyebrow">{t('THREE SMALL STEPS')}</p>
      <ol>
        {steps.map(
          /**
           * @returns One numbered introduction item with its translated title
           * and summary.
           */
          (step, i) => (
            <li key={step.title}>
              <span>0{i + 1}</span>
              <div>
                <strong>{t(step.title)}</strong>
                <p>{t(step.short)}</p>
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
