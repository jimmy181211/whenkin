import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import PopupSurface from './PopupSurface';
import Toast from './Toast';
import { useNotice } from '../utils/use-notice';
import {
  exactOption,
  matchingOptions,
  type EditableOption,
} from '../utils/editable-options';
import { t } from '../i18n/index';
import './editable-select.css';

/**
 * Allowed choices, current value, and validation behavior for an editable
 * dropdown.
 */
type Props = {
  label: string;
  value: string;
  options: EditableOption[];
  onChange: (value: string) => void;
  invalidMessage: string;
  numeric?: boolean;
};

/**
 * Reusable React combobox with searchable options and validated text input.
 * Typed text is temporary; on blur, invalid text restores the saved selection.
 * @param onChange - Called with an option's value, not its displayed label.
 * @param numeric - Show a numeric input keyboard; allowed options still
 * validate it.
 *
 * @param value - Saved option value; it must exist in options.
 * @returns An editable input, a filtered option menu when open, and feedback
 * for invalid input or no matches.
 *
 * @example Inside a parent React component
 * ```tsx
 * const [choice, setChoice] = useState('a');
 *
 * <EditableSelect
 *   label="Choice"
 *   value={choice}
 *   options={[
 *     {
 *       value: 'a',
 *       label: 'Option A',
 *     },
 *     {
 *       value: 'b',
 *       label: 'Option B',
 *     },
 *   ]}
 *   onChange={setChoice}
 *   invalidMessage="Choose an available option."
 * />
 * ```
 */
export default function EditableSelect({
  label,
  value,
  options,
  onChange,
  invalidMessage,
  numeric,
}: Props) {
  const [open, setOpen] = useState(false);
  // Text being typed, separate from the parent's committed value.
  const [query, setQuery] = useState('');
  // Index of the keyboard-highlighted choice, not the saved option value.
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const {
    notice,
    notify,
    dismissNotice,
  } = useNotice();
  const selected = options.find(
    /* Find the saved choice whose label should appear when the menu is closed. */
    (option) => option.value === value,
  )!;
  const choices = matchingOptions(options, query);

  /**
   * Open the dropdown at the current selection and clear old search
   * feedback.
   */
  const expand = () => {
    setOpen(true);
    setQuery('');
    setActive(
      Math.max(
        0,
        options.findIndex(
          /* Locate the saved option to initialize keyboard navigation. */
          (option) => option.value === value,
        ),
      ),
    );
    dismissNotice();
  };

  /** Commit an allowed option and close the dropdown. */
  const choose = (option: EditableOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    dismissNotice();
  };

  /** Commit an exact allowed match on blur; otherwise restore the previous value. */
  const finish = () => {
    if (!open) {
      return;
    }
    const exact = exactOption(options, query);
    if (exact) {
      choose(exact);
    } else {
      setOpen(false);
      setQuery('');
      if (query.trim()) {
        notify(invalidMessage, input.current);
      }
    }
  };

  /** Keep the active option visible without scrolling the surrounding page. */
  useLayoutEffect(() => {
    const list = menu.current;
    const option = list?.children[active] as HTMLElement | undefined;
    if (!list || !option) {
      return;
    }
    // Scroll the options only; do not move the surrounding page.
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    ) {
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [
    active,
    open,
    query,
  ]);
  return (
    <div className="editable-select">
      <input
        ref={input}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={
          open && choices[active] ? `${id}-${active}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        inputMode={numeric ? 'numeric' : 'text'}
        value={open ? query : selected.label}
        placeholder={selected.label}
        onFocus={expand}
        onClick={
          /* Open the dropdown when its input is clicked while closed. */
          () => {
            if (!open) {
              expand();
            }
          }
        }
        onChange={
          /* Update the search text and restart keyboard navigation at the first match. */
          (event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
            dismissNotice();
          }
        }
        onBlur={finish}
        onKeyDown={
          /* Handle option navigation, confirmation, and cancellation from the keyboard. */
          (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive(
                /* Keep the highlighted choice inside the filtered option list. */
                (index) =>
                  Math.max(
                    0,
                    Math.min(
                      choices.length - 1,
                      index + (event.key === 'ArrowDown' ? 1 : -1),
                    ),
                  ),
              );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (!open) {
                setQuery('');
                setOpen(true);
              } else if (choices[active]) {
                choose(choices[active]);
              } else {
                finish();
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setQuery('');
              dismissNotice();
            }
          }
        }
      />
      <button
        type="button"
        className="editable-select-toggle"
        tabIndex={-1}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={
          /* Keep input focus while the dropdown toggle is pressed. */
          (event) => event.preventDefault()
        }
        onClick={
          /* Finish an open edit or open the menu and focus its input. */
          () => {
            if (open) {
              finish();
            } else {
              expand();
              input.current?.focus({ preventScroll: true });
            }
          }
        }
      >
        <ChevronDown size={15} />
      </button>
      {open && (
        <PopupSurface
          ref={menu}
          id={id}
          className="editable-select-options"
          role="listbox"
          aria-label={label}
        >
          {choices.map(
            /**
             * @returns A selectable option with saved-selection and
             * keyboard-highlight state.
             */
            (option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                id={`${id}-${index}`}
                key={option.value}
                tabIndex={-1}
                data-active={index === active}
                onMouseDown={
                  /* Prevent blur from discarding a choice before its click is handled. */
                  (event) => event.preventDefault()
                }
                onClick={
                  /* Commit the option selected by the pointer. */
                  () => choose(option)
                }
              >
                {option.label}
              </button>
            ),
          )}
          {!choices.length && (
            <p className="editable-select-empty">{t('No matching options.')}</p>
          )}
        </PopupSurface>
      )}
      {notice && (
        <Toast
          key={notice.id}
          message={notice.message}
          anchor={notice.anchor}
          onDismiss={dismissNotice}
        />
      )}
    </div>
  );
}
