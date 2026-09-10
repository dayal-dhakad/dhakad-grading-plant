import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { store } from '@/app/store';
export const AppProviders = ({ children }: PropsWithChildren) => {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;
  return (
    <Provider store={store}>
      <Router>{children}</Router>
    </Provider>
  );
};
