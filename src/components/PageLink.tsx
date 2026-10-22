import type { AnchorHTMLAttributes } from 'react';

// Document navigation keeps lazy-loaded routes current and preserves unsaved-work protection.
export default function PageLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}/>;
}
