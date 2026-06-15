import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import { getAuthHeader, installFetchJwtInterceptor } from './utils/jwtAuth';

installFetchJwtInterceptor();
axios.interceptors.request.use((config) => {
  const headers = getAuthHeader();
  if (headers.Authorization && !config.headers?.Authorization) {
    config.headers = { ...config.headers, ...headers };
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


reportWebVitals();
