import type { AnchorHTMLAttributes } from 'react';

// Ordinary links preserve direct navigation and browser history. Availability autosaves independently.
export default function PageLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}/>;
}
