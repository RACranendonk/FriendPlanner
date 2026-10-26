import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyTheme, getThemePref } from './lib/theme';
import { applyLayout, getLayoutPref } from './lib/layout';

applyTheme(getThemePref());
applyLayout(getLayoutPref());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
