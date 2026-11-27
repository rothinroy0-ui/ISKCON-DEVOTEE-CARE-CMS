import React, { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api';
import UserModal from '../components/UserModal';
import { useToast } from '../components/Toast';

export default function Users({ currentUser, t }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSave = async (form, id) => {
    if (id) {
      await apiRequest(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      toast.success('User details saved successfully!');
    } else {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('New user saved successfully!');
    }
    await loadUsers();
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user @${u.username}?`)) return;
    try {
      await apiRequest(`/api/users/${u.id}`, { method: 'DELETE' });
      toast.success(`User @${u.username} deleted.`);
      await loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.navUsers}</h3>
            <p className="text-xs text-slate-500">
              Manage staff accounts & permissions (Admin, Editor, Viewer)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          {t.addUser}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">SL NO</th>
                <th className="px-5 py-3.5">{t.fullName}</th>
                <th className="px-5 py-3.5">{t.username}</th>
                <th className="px-5 py-3.5">{t.role}</th>
                <th className="px-5 py-3.5">{t.status}</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      {u.email && <div className="text-xs text-slate-400">{u.email}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-600">@{u.username}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                            : u.role === 'editor'
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}
                      >
                        {u.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(u);
                            setModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          title={t.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title={t.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        user={editing}
        t={t}
      />
    </div>
  );
}
