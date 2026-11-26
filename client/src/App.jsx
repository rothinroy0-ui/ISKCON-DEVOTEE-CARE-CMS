import React, { useEffect, useState } from 'react';
import { apiRequest, getToken, setToken } from './api';
import { translations } from './i18n';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterDevotee from './pages/RegisterDevotee';
import Devotees from './pages/Devotees';
import Birthdays from './pages/Birthdays';
import Users from './pages/Users';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  const t = translations.en;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    apiRequest('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(''))
      .finally(() => setCheckingAuth(false));
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
        <Login onLogin={setUser} t={t} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout
        user={user}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        t={t}
      >
        {activePage === 'dashboard' && (
          <Dashboard user={user} t={t} onNavigate={setActivePage} />
        )}
        {activePage === 'register' && (user.role === 'admin' || user.role === 'editor') && (
          <RegisterDevotee t={t} onNavigate={setActivePage} />
        )}
        {activePage === 'devotees' && <Devotees user={user} t={t} />}
        {activePage === 'birthdays' && <Birthdays user={user} t={t} />}
        {activePage === 'users' && user.role === 'admin' && (
          <Users currentUser={user} t={t} />
        )}
      </Layout>
    </ToastProvider>
  );
}
