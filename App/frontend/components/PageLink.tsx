import type { AnchorHTMLAttributes } from 'react';

/**
 * Link component that preserves ordinary browser navigation and history.
 * Availability autosaves independently.
 * @returns An anchor element with the supplied link attributes and children.
 */
export default function PageLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  return <a {...props} />;
}
