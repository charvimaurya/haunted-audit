import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ImmersionProvider } from './immersion/ImmersionContext';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ImmersionProvider>
      <App />
    </ImmersionProvider>
  </StrictMode>,
);
