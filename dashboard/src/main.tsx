import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import '@fontsource/rubik-wet-paint';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { AppRoutes } from './AppRoutes';
import { ImmersionProvider } from './immersion/ImmersionContext';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Vite's base is "/" locally and "/haunted-audit/" on GitHub Pages
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(root).render(
  <StrictMode>
    <HeroUIProvider>
      <ImmersionProvider>
        <BrowserRouter basename={basename}>
          <AppRoutes />
        </BrowserRouter>
      </ImmersionProvider>
    </HeroUIProvider>
  </StrictMode>,
);
