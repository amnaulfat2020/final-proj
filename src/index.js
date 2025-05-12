import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { PageProvider } from './contexts/PageContext';
import { SearchProvider } from './contexts/SearchContext';



ReactDOM.render(
  <React.StrictMode>
    <SearchProvider>
    <PageProvider>
      <App />
    </PageProvider>
    </SearchProvider>
  </React.StrictMode>,
  document.getElementById('root')
);