import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function UserModal({ isOpen, onClose, onSave, user, t }) {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'editor',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        password: '',
        role: user.role || 'editor',
        is_active: Boolean(user.is_active),
      });
    } else {
      setForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'editor',
        is_active: true,
      });
    }
    setError('');
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form, user?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {user ? t.editUser : t.addUser}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t.fullName} *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t.username} *
            </label>
            <input
              required
              disabled={Boolean(user)}
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t.email}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t.password} {user ? '(leave blank to keep unchanged)' : '*'}
            </label>
            <input
              required={!user}
              minLength={6}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t.role}
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="editor">{t.roleEditor}</option>
              <option value="admin">{t.roleAdmin}</option>
              <option value="viewer">{t.roleViewer}</option>
            </select>
          </div>

          {user && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t.active}
            </label>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '...' : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
