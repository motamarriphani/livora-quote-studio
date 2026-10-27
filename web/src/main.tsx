import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { UiProvider } from './ui';
import { App } from './App';
import './styles.css';
import './app.css';

// Both values are public (they ship to every browser). Override per
// environment with VITE_CLERK_PUBLISHABLE_KEY / VITE_CONVEX_URL.
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bXV0dWFsLWNvcmFsLTM1LmNsZXJrLmFjY291bnRzLmRldiQ';
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || 'https://careful-badger-891.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <UiProvider>
            <App />
          </UiProvider>
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
