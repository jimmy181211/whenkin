/** Shared link field and copy feedback; clipboard work remains with the caller. */
import { Check, Copy } from 'lucide-react';

/** A labeled URL field and the copy action/state owned by its parent. */
type Props = {
  id: string;
  value: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: () => Promise<void>;
  inputClassName?: string;
  buttonClassName?: string;
};

/**
 * Reusable copy-link controls that also allow manual selection of the URL.
 * The caller supplies a label associated with id and handles copy failures.
 * @returns A read-only URL input and a button reflecting the supplied copy status.
 */
export default function CopyLinkControl({
  id,
  value,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
  inputClassName,
  buttonClassName = '',
}: Props) {
  return (
    <>
      <input
        id={id}
        className={inputClassName}
        readOnly
        value={value}
        onFocus={
          /** Select the full URL for manual copying. */
          (event) => event.target.select()
        }
      />
      <button
        type="button"
        className={`button primary ${buttonClassName}`.trim()}
        onClick={
          /** Invoke the caller's clipboard action and feedback handling. */
          () => void onCopy()
        }
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </>
  );
}
