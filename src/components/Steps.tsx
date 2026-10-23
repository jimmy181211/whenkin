import { CalendarDays, Check, Users } from 'lucide-react';
import { t } from '../lib/i18n';
const steps = [
    { title: "The Organizer Creates an Event", short: 'Choose possible dates and hours, then share the link.', icon: CalendarDays },
    { title: "Participants Mark When They’re Free", short: 'Open the link and drag across the time grid. No account needed.', icon: Users },
    { title: "Whenkin Suggests the Best Times", short: 'We compare availability. The organizer shares the chosen time.', icon: Check },
];
export default function Steps() {
    return (<div className="how-it-works">
      <p className="eyebrow">{t("THREE SMALL STEPS")}</p>
      <ol>
        {steps.map((step, i) => <li key={step.title}>
          <span>0{i + 1}</span>
          <div><strong>{t(step.title)}</strong><p>{t(step.short)}</p></div>
        </li>)}
      </ol>
    </div>);
}
