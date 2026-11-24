import { createRoot } from 'react-dom/client';
import App from './App';
import { browserInstall } from './utils/browser-install';
import { shortcutManifestHref } from '../shared/shortcut-path';
import './styles.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';

browserInstall.listen(window);
// Also use the current page in Vite development, where HTML is served directly.
const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
if (manifest) {
  manifest.href = shortcutManifestHref(window.location.pathname);
}
createRoot(document.getElementById('root')!).render(<App />);
