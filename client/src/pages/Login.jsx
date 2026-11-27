import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { apiRequest, setToken } from '../api';

export default function Login({ onLogin, t }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <img
        src="/watermark.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 z-0 w-72 -translate-x-1/2 -translate-y-1/2 select-none opacity-50 sm:w-96"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white/85 p-8 shadow-xl ring-1 ring-slate-200/80">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="ISKCON Durgapur"
            className="mx-auto mb-3 h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-sm ring-1 ring-slate-200"
          />
          <h1 className="text-2xl font-bold text-slate-900">{t.loginTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.loginSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t.username}
            </label>
            <div className="relative">
              <User className="absolute top-2.5 left-3.5 h-4 w-4 text-slate-400" />
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-4 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3.5 h-4 w-4 text-slate-400" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-4 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '...' : t.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
