import React, { Suspense, lazy, useEffect, useState } from 'react';
import { apiRequest, getToken, setToken } from './api';
import { translations } from './i18n';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ImagePreviewProvider } from './components/ImagePreviewModal';
import { ConfirmProvider } from './components/ConfirmModal';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Devotees = lazy(() => import('./pages/Devotees'));
const Birthdays = lazy(() => import('./pages/Birthdays'));
const Anniversaries = lazy(() => import('./pages/Anniversaries'));
const Parcels = lazy(() => import('./pages/Parcels'));
const Removals = lazy(() => import('./pages/Removals'));
const BulkCorrection = lazy(() => import('./pages/BulkCorrection'));
const Insights = lazy(() => import('./pages/Insights'));
const Users = lazy(() => import('./pages/Users'));

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto my-12 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
          <h3 className="text-base font-bold text-rose-900">
            Unable to load this page
          </h3>
          <p className="mt-1.5 text-xs text-rose-700">
            {this.state.error?.message || 'A new version may have been deployed.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  const t = translations.en;

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken('');
      setUser(null);
      setActivePage('dashboard');
    };
    window.addEventListener('cms:unauthorized', handleUnauthorized);

    const token = getToken();
    if (!token) {
      setCheckingAuth(false);
      return () => window.removeEventListener('cms:unauthorized', handleUnauthorized);
    }
    apiRequest('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(''))
      .finally(() => setCheckingAuth(false));

    return () => window.removeEventListener('cms:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setActivePage('dashboard');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading SevaCMS...
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <img
          src="/watermark.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none fixed top-1/2 left-1/2 z-30 w-64 -translate-x-1/2 -translate-y-1/2 select-none opacity-50 sm:w-80"
        />
        <Login onLogin={setUser} t={t} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <ImagePreviewProvider>
          <img
            src="/watermark.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none fixed top-1/2 left-1/2 z-30 w-72 -translate-x-1/2 -translate-y-1/2 select-none opacity-50 sm:w-96"
          />
          <Layout
          user={user}
          activePage={activePage}
          onNavigate={setActivePage}
          onLogout={handleLogout}
          t={t}
        >
          <PageErrorBoundary key={activePage}>
            <Suspense
              fallback={
                <div className="py-12 text-center text-sm text-slate-500">
                  Loading page...
                </div>
              }
            >
              {activePage === 'dashboard' && (
                <Dashboard user={user} t={t} onNavigate={setActivePage} />
              )}
              {activePage === 'devotees' && <Devotees user={user} t={t} />}
              {activePage === 'birthdays' && <Birthdays user={user} t={t} />}
              {activePage === 'anniversaries' && <Anniversaries user={user} />}
              {activePage === 'parcels' && <Parcels user={user} />}
              {activePage === 'removals' && <Removals user={user} />}
              {activePage === 'bulk-fix' &&
                (user.role === 'admin' || user.role === 'editor') && (
                  <BulkCorrection />
                )}
              {activePage === 'insights' && <Insights />}
              {activePage === 'users' && user.role === 'admin' && (
                <Users currentUser={user} t={t} />
              )}
            </Suspense>
          </PageErrorBoundary>
        </Layout>
      </ImagePreviewProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
