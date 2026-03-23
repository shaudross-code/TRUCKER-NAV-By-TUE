
console.log("index.tsx loaded");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handling
window.onerror = (message, source, lineno, colno, error) => {
  console.log("!!! GLOBAL ERROR DETECTED !!!");
  console.error("Global Error:", { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  console.log("!!! UNHANDLED PROMISE REJECTION DETECTED !!!");
  console.error("Unhandled Promise Rejection:", event.reason);
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
