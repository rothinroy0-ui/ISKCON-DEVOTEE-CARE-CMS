import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  FileDown,
  Pencil,
  Trash2,
  Cake,
  Phone,
} from 'lucide-react';
import { apiRequest, getToken } from '../api';
import DevoteeModal from '../components/DevoteeModal';
import { useToast } from '../components/Toast';
import { useImagePreview } from '../components/ImagePreviewModal';
import { useConfirm } from '../components/ConfirmModal';
import { exportDevoteesPdf } from '../utils/pdfExport';
import { hasPermission } from '../utils/permissions';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Devotees({ user, t }) {
  const toast = useToast();
  const { openImage } = useImagePreview();
  const confirm = useConfirm();
  const [devotees, setDevotees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('upcoming_birthday');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const canEdit = hasPermission(user, 'devotees_edit');

  const buildQuery = (limit, offset) => {
    const params = new URLSearchParams({ search, month, status, sort });
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    return params.toString();
  };

  const loadDevotees = async ({ limit = 60, offset = 0, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await apiRequest(`/api/devotees?${buildQuery(limit, offset)}`, {
        cache: true,
      });
      const rows = data.devotees || [];
      setTotal(data.total ?? rows.length);
      setDevotees((prev) => (append ? [...prev, ...rows] : rows));
    } catch (err) {
      console.error(err);
      if (!append) {
        setDevotees([]);
        setTotal(0);
      }
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadDevotees({ limit: 60, offset: 0 }), 150);
    return () => clearTimeout(timer);
  }, [search, month, status, sort]);

  const handleSave = async (form, id) => {
    if (id) {
      await apiRequest(`/api/devotees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      toast.success('Devotee details saved successfully!');
    } else {
      await apiRequest('/api/devotees', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('New devotee saved successfully!');
    }
    await loadDevotees({ limit: Math.max(60, devotees.length), offset: 0 });
  };

  const handleDelete = async (d) => {
    const ok = await confirm({
      title: 'Move to Recycle Bin?',
      message: `Move "${d.full_name}" (${d.devotee_id}) to the Recycle Bin? The record can be restored later from the Recycle Bin tab.`,
      confirmText: 'Move to Recycle Bin',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/devotees/${d.id}`, { method: 'DELETE' });
      toast.success(`${d.full_name} moved to Recycle Bin.`);
      await loadDevotees({ limit: Math.max(60, devotees.length), offset: 0 });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExport = () => {
    const token = getToken();
    window.open(`/api/devotees/export/csv?token=${encodeURIComponent(token)}`, '_blank');
  };

  const handleExportPdf = async () => {
    if (total === 0) return;
    try {
      const data = await apiRequest(`/api/devotees?${buildQuery(0, 0)}`, { cache: true });
      const list = data.devotees || [];
      if (list.length === 0) return;
      const filters = [];
      if (search.trim()) filters.push(`Search: "${search.trim()}"`);
      if (month) filters.push(`Month: ${MONTHS[Number(month) - 1]}`);
      if (status !== 'all') filters.push(`Status: ${status}`);
      await exportDevoteesPdf(list, {
        subtitle: `ISKCON Durgapur · ${list.length} devotee${
          list.length === 1 ? '' : 's'
        }${filters.length ? ` · ${filters.join(' · ')}` : ''}`,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to export PDF');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pr-4 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">{t.allMonths}</option>
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">{t.allStatus}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="upcoming_birthday">Sort: Upcoming Birthday</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="newest">Sort: Recently Added</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            {t.exportCsv}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={devotees.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {t.exportPdf}
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {t.registerDevotee}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">SL NO</th>
                <th className="px-5 py-3.5">{t.devoteeId}</th>
                <th className="px-5 py-3.5">{t.fullName}</th>
                <th className="px-5 py-3.5">{t.phone}</th>
                <th className="px-5 py-3.5">{t.dob}</th>
                <th className="px-5 py-3.5">{t.status}</th>
                {canEdit && <th className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-6 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                    {canEdit && (
                      <td className="px-5 py-4"><div className="ml-auto h-4 w-16 rounded bg-slate-100" /></td>
                    )}
                  </tr>
                ))
              ) : devotees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                devotees.map((d, idx) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700 ring-1 ring-indigo-200/80">
                        {d.devotee_id || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {d.photo_url ? (
                          <img
                            src={d.photo_url}
                            alt={d.full_name}
                            loading="lazy"
                            onClick={() =>
                              openImage(d.photo_url, d.full_name, d.devotee_id)
                            }
                            title="Click to enlarge photo"
                            className="h-10 w-9 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200 transition hover:ring-2 hover:ring-indigo-400"
                          />
                        ) : (
                          <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {d.full_name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{d.full_name}</div>
                          {(d.initiated_name || d.spiritual_name) && (
                            <div className="text-xs text-indigo-600">
                              {d.initiated_name || d.spiritual_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {d.contact_no || d.phone}
                      </div>
                      {(d.town_city || d.city || d.blood_group) && (
                        <div className="text-xs text-slate-400">
                          {[d.town_city || d.city, d.blood_group].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Cake className="h-3.5 w-3.5 text-rose-500" />
                        {d.dob}
                        {d.age !== null && (
                          <span className="text-xs text-slate-500">({d.age} yrs)</span>
                        )}
                      </div>
                      {d.is_birthday_today ? (
                        <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          {t.birthdayTodayBadge}
                        </span>
                      ) : (
                        d.days_until_birthday !== null && (
                          <span className="text-xs text-slate-500">
                            {t.inDays.replace('{n}', d.days_until_birthday)}
                          </span>
                        )
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          d.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        }`}
                      >
                        {d.status === 'active' ? t.active : t.inactive}
                      </span>
                    </td>

                    {canEdit && (
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(d);
                              setModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title={t.edit}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title={t.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {devotees.length < total && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <button
              type="button"
              onClick={() =>
                loadDevotees({ limit: 60, offset: devotees.length, append: true })
              }
              disabled={loadingMore}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore
                ? 'Loading...'
                : `Show 60 More (${total - devotees.length} remaining)`}
            </button>
            <button
              type="button"
              onClick={() => loadDevotees({ limit: 0, offset: 0 })}
              disabled={loadingMore}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Show All ({total})
            </button>
          </div>
        )}
      </div>

      <DevoteeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        devotee={editing}
        t={t}
      />
    </div>
  );
}
