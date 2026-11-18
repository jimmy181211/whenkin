import type { Ref } from 'react';
import { t } from '../i18n/index';

/**
 * Name value, input reference, and validation state for the reply-name
 * field.
 */
type Props = {
  name: string;
  onChange: (name: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  editNotice: boolean;
  disabled?: boolean;
};

/**
 * Reply-name input component with the shared required-field reminder
 * appearance.
 * @returns A labeled name input with the current validation and disabled
 * state.
 */
export default function ParticipantName({
  name,
  onChange,
  inputRef,
  editNotice,
  disabled,
}: Props) {
  const showNotice = !name.trim() && editNotice;
  return (
    <div className="participant-line">
      <div className="participant-name">
        <label htmlFor="participant-name">{t('Your Name')}</label>
        <div className="participant-name-field">
          <input
            id="participant-name"
            disabled={disabled}
            ref={inputRef}
            maxLength={60}
            placeholder={t('Enter your name')}
            value={name}
            aria-invalid={showNotice}
            onChange={
              /* Pass the edited name text to the page's draft handler. */
              (e) => onChange(e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
}
