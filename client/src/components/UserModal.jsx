import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  PERMISSION_OPTIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from '../utils/permissions';

export default function UserModal({ isOpen, onClose, onSave, user, t }) {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'editor',
    permissions: DEFAULT_PERMISSIONS_BY_ROLE.editor,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const role = user.role || 'editor';
      setForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        password: '',
        role,
        permissions: Array.isArray(user.permissions)
          ? user.permissions
          : DEFAULT_PERMISSIONS_BY_ROLE[role] || [],
        is_active: Boolean(user.is_active),
      });
    } else {
      setForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'editor',
        permissions: DEFAULT_PERMISSIONS_BY_ROLE.editor,
        is_active: true,
      });
    }
    setError('');
  }, [user, isOpen]);

  const handleRoleChange = (nextRole) => {
    setForm((prev) => ({
      ...prev,
      role: nextRole,
      permissions: DEFAULT_PERMISSIONS_BY_ROLE[nextRole] || [],
    }));
  };

  const togglePermission = (permKey) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
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
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="editor">{t.roleEditor}</option>
              <option value="admin">{t.roleAdmin}</option>
              <option value="viewer">{t.roleViewer}</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Custom Permissions ({form.permissions.length} selected)
              </label>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      permissions: PERMISSION_OPTIONS.map((p) => p.key),
                    }))
                  }
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, permissions: [] }))
                  }
                  className="text-rose-600 hover:text-rose-700"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:grid-cols-2">
              {PERMISSION_OPTIONS.map((perm) => {
                const checked =
                  form.role === 'admin' || form.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                      checked
                        ? 'border-indigo-200 bg-white text-slate-900 shadow-2xs'
                        : 'border-transparent text-slate-500 hover:bg-white/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={form.role === 'admin'}
                      onChange={() => togglePermission(perm.key)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight">
                        {perm.label}
                      </div>
                      <div className="mt-0.5 text-[10px] leading-tight text-slate-400">
                        {perm.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {form.role === 'admin' && (
              <p className="mt-1 text-[11px] text-slate-400">
                Admin automatically has full access to all sections.
              </p>
            )}
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
