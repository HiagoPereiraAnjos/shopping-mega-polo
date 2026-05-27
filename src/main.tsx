import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { SiteSettingsProvider } from './hooks/useSiteSettings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteSettingsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SiteSettingsProvider>
  </StrictMode>,
);
