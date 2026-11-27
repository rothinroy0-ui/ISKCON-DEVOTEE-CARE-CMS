import React, { useEffect, useMemo, useState } from 'react';
import {
  ArchiveX,
  RotateCcw,
  Search,
  Phone,
  Cake,
  Heart,
  Package,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useImagePreview } from '../components/ImagePreviewModal';
import { hasPermission } from '../utils/permissions';

const CATEGORY_META = {
  birthday: {
    label: 'Birthdays',
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    icon: Cake,
  },
  anniversary: {
    label: 'Anniversaries',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: Heart,
  },
  parcel: {
    label: 'Parcels',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: Package,
  },
};

export default function Removals({ user }) {
  const toast = useToast();
  const { openImage } = useImagePreview();
  const [removals, setRemovals] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canEdit =
    hasPermission(user, 'removals') || hasPermission(user, 'devotees_edit');

  const loadRemovals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/devotees/removals/list');
      setRemovals(res.removals || []);
    } catch (err) {
      setError(err.message || 'Failed to load removal records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemovals();
  }, []);

  const filtered = useMemo(() => {
    let list = removals;
    if (categoryFilter !== 'all') {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.devotee_id && r.devotee_id.toLowerCase().includes(q)) ||
          (r.full_name && r.full_name.toLowerCase().includes(q)) ||
          (r.initiated_name && r.initiated_name.toLowerCase().includes(q)) ||
          (r.spouses_name && r.spouses_name.toLowerCase().includes(q)) ||
          (r.contact_no && r.contact_no.toLowerCase().includes(q)) ||
          (r.town_city && r.town_city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [removals, categoryFilter, search]);

  const counts = useMemo(
    () => ({
      all: removals.length,
      birthday: removals.filter((r) => r.category === 'birthday').length,
      anniversary: removals.filter((r) => r.category === 'anniversary').length,
      parcel: removals.filter((r) => r.category === 'parcel').length,
    }),
    [removals]
  );

  const handleRestore = async (item) => {
    if (!canEdit) return;
    try {
      await apiRequest(`/api/devotees/${item.id}/remove-from-tab/${item.category}`, {
        method: 'DELETE',
      });
      setRemovals((prev) =>
        prev.filter((r) => !(r.id === item.id && r.category === item.category))
      );
      const tabName = CATEGORY_META[item.category]?.label || item.category;
      toast.success(`Restored ${item.full_name} back to ${tabName}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to restore record');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI / Filter Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            categoryFilter === 'all'
              ? 'ring-2 ring-slate-700'
              : 'ring-slate-200/80 hover:ring-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Removed
            </span>
            <ArchiveX className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{counts.all}</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setCategoryFilter(categoryFilter === 'birthday' ? 'all' : 'birthday')
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            categoryFilter === 'birthday'
              ? 'ring-2 ring-indigo-500'
              : 'ring-indigo-200/80 hover:ring-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">
              From Birthdays
            </span>
            <Cake className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-700">
            {counts.birthday}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setCategoryFilter(
              categoryFilter === 'anniversary' ? 'all' : 'anniversary'
            )
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            categoryFilter === 'anniversary'
              ? 'ring-2 ring-rose-500'
              : 'ring-rose-200/80 hover:ring-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">
              From Anniversaries
            </span>
            <Heart className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {counts.anniversary}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setCategoryFilter(categoryFilter === 'parcel' ? 'all' : 'parcel')
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            categoryFilter === 'parcel'
              ? 'ring-2 ring-amber-500'
              : 'ring-amber-200/80 hover:ring-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              From Parcels
            </span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {counts.parcel}
          </p>
        </button>
      </div>

      {/* Main List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <ArchiveX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Removal Record ({filtered.length})
              </h3>
              <p className="text-xs text-slate-500">
                Devotees removed from Birthdays, Anniversaries, or Parcels (still
                kept in main Devotees database)
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ID, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading removal records...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 py-8 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
            No removed records found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">SL NO</th>
                  <th className="px-4 py-3">Devotee</th>
                  <th className="px-4 py-3">Removed From</th>
                  <th className="px-4 py-3">Mobile &amp; City</th>
                  <th className="px-4 py-3">Removed Date</th>
                  {canEdit && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => {
                  const meta = CATEGORY_META[item.category] || {
                    label: item.category,
                    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
                  };
                  return (
                    <tr key={`${item.id}-${item.category}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.full_name}
                              loading="lazy"
                              onClick={() =>
                                openImage(
                                  item.photo_url,
                                  item.full_name,
                                  item.devotee_id
                                )
                              }
                              className="h-9 w-8 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <span className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                              {item.full_name?.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.full_name}
                            </div>
                            {item.initiated_name && (
                              <div className="text-xs text-indigo-600">
                                {item.initiated_name}
                              </div>
                            )}
                            <div className="font-mono text-[11px] text-slate-400">
                              {item.devotee_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {item.contact_no || '—'}
                        </div>
                        {item.town_city && (
                          <div className="text-slate-400">{item.town_city}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        <div>
                          {item.removed_at
                            ? new Date(item.removed_at).toLocaleDateString()
                            : '—'}
                        </div>
                        {item.removed_by_name && (
                          <div className="text-[11px] text-slate-400">
                            by {item.removed_by_name}
                          </div>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
