import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const THEME_KEY = 'sjps_theme';
const storedTheme = localStorage.getItem(THEME_KEY);
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
document.documentElement.dataset.theme = initialTheme;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
