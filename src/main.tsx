import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import type { AuthenticationResult, EventMessage } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './services/authConfig';

// Initialize MSAL outside of component to avoid re-initialization
const msalInstance = new PublicClientApplication(msalConfig);

// Account selection logic is app dependent. Adjust as needed for different use cases.
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

msalInstance.addEventCallback((event: EventMessage) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const payload = event.payload as AuthenticationResult;
    if (payload.account) {
      msalInstance.setActiveAccount(payload.account);
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);
