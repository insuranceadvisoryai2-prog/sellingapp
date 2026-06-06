import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Add global interceptor to bypass localtunnel warning page
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  if (!config) config = {};
  if (!config.headers) config.headers = {};
  
  // Create a new Headers object or plain object to safely add the header
  const headers = new Headers(config.headers);
  headers.set('Bypass-Tunnel-Reminder', 'true');
  config.headers = headers;
  
  return originalFetch(resource, config);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
