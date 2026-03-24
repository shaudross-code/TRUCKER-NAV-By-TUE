
console.log("index.tsx loaded");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handling
window.onerror = (message, source, lineno, colno, error) => {
  // Ignore benign Vite WebSocket errors
  const msg = typeof message === 'string' ? message : '';
  if (msg.includes('failed to connect to websocket') || (source && source.includes('@vite/client'))) {
    return;
  }
  console.log("!!! GLOBAL ERROR DETECTED !!!");
  console.error("Global Error:", { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  // Ignore benign Vite WebSocket errors
  const reason = event.reason;
  const message = reason?.message || String(reason);
  const stack = reason?.stack || '';
  
  if (message.includes('WebSocket closed without opened') || 
      message.includes('failed to connect to websocket') ||
      stack.includes('@vite/client')) {
    return;
  }

  console.log("!!! UNHANDLED PROMISE REJECTION DETECTED !!!");
  console.error("Unhandled Promise Rejection:", event.reason);
  console.error("Unhandled Rejection Detail:", {
    reason: event.reason,
    stack: event.reason?.stack
  });
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
console.log("Rendering App");
root.render(
    <App />
);
