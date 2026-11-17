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

type Props = {
  label: string;
  value: string;
  options: EditableOption[];
  onChange: (value: string) => void;
  invalidMessage: string;
  numeric?: boolean;
};

/** Editable combobox: committed values always come from the allowed options. */
export default function EditableSelect({
  label,
  value,
  options,
  onChange,
  invalidMessage,
  numeric,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const {
    notice,
    notify,
    dismissNotice,
  } = useNotice();
  const selected = options.find((option) => option.value === value)!;
  const choices = matchingOptions(options, query);

  const expand = () => {
    setOpen(true);
    setQuery('');
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    dismissNotice();
  };

  const choose = (option: EditableOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    dismissNotice();
  };

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
        onClick={() => {
          if (!open) {
            expand();
          }
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
          dismissNotice();
        }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
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
        }}
      />
      <button
        type="button"
        className="editable-select-toggle"
        tabIndex={-1}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            finish();
          } else {
            expand();
            input.current?.focus({ preventScroll: true });
          }
        }}
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
          {choices.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              id={`${id}-${index}`}
              key={option.value}
              tabIndex={-1}
              data-active={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
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
