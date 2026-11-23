/** Places page-owned actions in the shared header without duplicating state. */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useDisclosure } from '../utils/use-disclosure';

/** The two header locations used by an event page's controls. */
type ActionName = 'share' | 'guide';

/** Header targets and navigation state; action logic remains in the page. */
type HeaderContext = {
  share: HTMLDivElement | null;
  guide: HTMLDivElement | null;
  setShare: (node: HTMLDivElement | null) => void;
  setGuide: (node: HTMLDivElement | null) => void;
  menu: ReturnType<typeof useDisclosure>;
};

const Context = createContext<HeaderContext | null>(null);

/**
 * Share header DOM targets and the mobile menu with the current page.
 * @returns The supplied layout with a single navigation-state provider.
 */
export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [share, setShare] = useState<HTMLDivElement | null>(null);
  const [guide, setGuide] = useState<HTMLDivElement | null>(null);
  const menu = useDisclosure();
  return (
    <Context.Provider
      value={{
        share,
        guide,
        setShare,
        setGuide,
        menu,
      }}
    >
      {children}
    </Context.Provider>
  );
}

/**
 * Read the enclosing layout's header controls.
 * @returns Shared targets and menu actions; throws when used outside the layout.
 */
export function useHeaderActions() {
  const value = useContext(Context);
  if (!value) {
    throw new Error('Header actions require HeaderActionsProvider.');
  }
  return value;
}

/**
 * Mount one stable header target for page-owned actions.
 * @returns An empty target div that receives its control through a portal.
 */
export function HeaderActionSlot({ name }: { name: ActionName }) {
  const context = useHeaderActions();
  return (
    <div
      className={`header-${name}-slot`}
      ref={name === 'share' ? context.setShare : context.setGuide}
    />
  );
}

/**
 * Render a page control into the shared header while retaining page ownership.
 * @returns The control portal, or nothing until its header target is mounted.
 */
export function HeaderAction({
  name,
  children,
}: {
  name: ActionName;
  children: ReactNode;
}) {
  const target = useHeaderActions()[name];
  return target ? createPortal(children, target) : null;
}
