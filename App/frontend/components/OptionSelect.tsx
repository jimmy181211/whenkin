import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import PopupSurface from './PopupSurface';
import './option-select.css';
/** One selectable value and its displayed label. */
export type SelectOption = {
  value: string;
  label: string;
};

/**
 * Allowed options, saved selection and the action that commits a new value.
 */
type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

/**
 * Reusable selection-only combobox whose scrollable option list opens below it.
 * @param value - Saved option value; it must exist in options.
 * @param onChange - Receives the chosen value, not the displayed label.
 * @returns A selection button and an option list supporting pointer and keyboard selection.
 */
export default function OptionSelect({
  label,
  value,
  options,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  // Index of the keyboard-highlighted choice, not the saved option value.
  const [active, setActive] = useState(0);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(
    /* Find the saved choice whose label should appear when the menu is closed. */
    (option) => option.value === value,
  )!;

  /**
   * Open the dropdown at the saved selection.
   */
  const expand = () => {
    setOpen(true);
    setActive(
      Math.max(
        0,
        options.findIndex(
          /* Locate the saved option to initialize keyboard navigation. */
          (option) => option.value === value,
        ),
      ),
    );
  };

  /** Commit an allowed option and close the dropdown. */
  const choose = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  /** Close without changing the saved value when focus leaves the selector. */
  const finish = () => setOpen(false);

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
    } else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [
    active,
    open,
  ]);
  return (
    <div className="option-select">
      <button
        type="button"
        className="option-select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
        onClick={
          /** Toggle the list from the whole control, including its arrow. */
          () => {
            if (open) {
              finish();
            } else {
              expand();
            }
          }
        }
        onBlur={finish}
        onKeyDown={
          /* Handle option navigation, confirmation, and cancellation from the keyboard. */
          (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                expand();
                return;
              }
              setActive(
                /* Keep the highlighted choice inside the available option list. */
                (index) =>
                  Math.max(
                    0,
                    Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                  ),
              );
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!open) {
                expand();
              } else if (options[active]) {
                choose(options[active]);
              } else {
                finish();
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }
        }
      >
        <span>{selected.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <PopupSurface
          ref={menu}
          id={id}
          className="option-select-options"
          role="listbox"
          aria-label={label}
        >
          {options.map(
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
        </PopupSurface>
      )}
    </div>
  );
}
