import React, { useEffect, useMemo, useState } from 'react';
import {
  Recycle,
  RotateCcw,
  Search,
  Trash2,
  AlertTriangle,
  Phone,
  MapPin,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useImagePreview } from '../components/ImagePreviewModal';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecycleBin({ user }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { openImage } = useImagePreview();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const canRestore = user?.role === 'admin' || user?.role === 'editor';
  const canDeleteForever = user?.role === 'admin';

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/devotees/recycle-bin');
      setItems(res.devotees || []);
    } catch (err) {
      setError(err.message || 'Failed to load Recycle Bin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (d) =>
        (d.devotee_id && d.devotee_id.toLowerCase().includes(q)) ||
        (d.full_name && d.full_name.toLowerCase().includes(q)) ||
        (d.initiated_name && d.initiated_name.toLowerCase().includes(q)) ||
        (d.contact_no && d.contact_no.toLowerCase().includes(q)) ||
        (d.town_city && d.town_city.toLowerCase().includes(q)) ||
        (d.deleted_by_name && d.deleted_by_name.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleRestore = async (item) => {
    if (!canRestore) return;
    const ok = await confirm({
      title: 'Restore Devotee?',
      message: `Restore "${item.full_name}" (${item.devotee_id}) to the Devotees directory? Their birthday wishes, parcels, and removal records will also be restored.`,
      confirmText: 'Yes, Restore',
      variant: 'primary',
    });
    if (!ok) return;

    setBusyId(item.id);
    try {
      await apiRequest(`/api/devotees/recycle-bin/${item.id}/restore`, {
        method: 'POST',
      });
      setItems((prev) => prev.filter((d) => d.id !== item.id));
      toast.success(`${item.full_name} restored successfully.`);
    } catch (err) {
      toast.error(err.message || 'Failed to restore devotee');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteForever = async (item) => {
    if (!canDeleteForever) return;
    const ok = await confirm({
      title: 'Delete Permanently?',
      message: `Permanently delete "${item.full_name}" (${item.devotee_id})? This cannot be undone and will also remove their wishes, parcels, and removal records.`,
      confirmText: 'Delete Forever',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(item.id);
    try {
      await apiRequest(`/api/devotees/recycle-bin/${item.id}`, {
        method: 'DELETE',
      });
      setItems((prev) => prev.filter((d) => d.id !== item.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.success(`${item.full_name} permanently deleted.`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete devotee');
    } finally {
      setBusyId(null);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((d) => next.delete(d.id));
      } else {
        filtered.forEach((d) => next.add(d.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkRestore = async () => {
    if (!canRestore || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const ok = await confirm({
      title: 'Restore Selected Devotees?',
      message: `Restore ${ids.length} selected devotee(s) to the Devotees directory?`,
      confirmText: `Yes, Restore (${ids.length})`,
      variant: 'primary',
    });
    if (!ok) return;

    setBulkBusy(true);
    let restored = 0;
    const restoredSet = new Set();
    try {
      for (const id of ids) {
        try {
          await apiRequest(`/api/devotees/recycle-bin/${id}/restore`, {
            method: 'POST',
          });
          restored += 1;
          restoredSet.add(id);
        } catch {
          // continue restoring remaining
        }
      }
      if (restored > 0) {
        setItems((prev) => prev.filter((d) => !restoredSet.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          restoredSet.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Restored ${restored} devotee(s) successfully.`);
      } else {
        toast.error('Failed to restore selected devotees.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDeleteForever = async () => {
    if (!canDeleteForever || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const ok = await confirm({
      title: 'Delete Selected Permanently?',
      message: `Permanently delete ${ids.length} selected devotee(s)? This cannot be undone.`,
      confirmText: `Delete Forever (${ids.length})`,
      variant: 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    let deleted = 0;
    const deletedSet = new Set();
    try {
      for (const id of ids) {
        try {
          await apiRequest(`/api/devotees/recycle-bin/${id}`, {
            method: 'DELETE',
          });
          deleted += 1;
          deletedSet.add(id);
        } catch {
          // continue deleting remaining
        }
      }
      if (deleted > 0) {
        setItems((prev) => prev.filter((d) => !deletedSet.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedSet.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Permanently deleted ${deleted} devotee(s).`);
      } else {
        toast.error('Failed to delete selected devotees.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / count */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
            <Recycle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              In Recycle Bin
            </p>
            <p className="text-2xl font-bold text-slate-900">{items.length}</p>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted devotees..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Deleted Devotees ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Deleted records stay here until restored. Restoring brings back the
              devotee along with their wishes, parcels, and removal records.
            </p>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkBusy}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>
              {canRestore && (
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Selected
                </button>
              )}
              {canDeleteForever && (
                <button
                  type="button"
                  onClick={handleBulkDeleteForever}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Forever
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all deleted devotees"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-5 py-3.5">Devotee</th>
                <th className="px-5 py-3.5">Devotee ID</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Deleted On</th>
                <th className="px-5 py-3.5">Deleted By</th>
                <th className="px-5 py-3.5">Related</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-4 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-9 w-48 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="ml-auto h-8 w-28 rounded bg-slate-100" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                        <Recycle className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {search.trim() ? 'No matching deleted devotees' : 'Recycle Bin is empty'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {search.trim()
                          ? 'Try a different name, phone, or devotee ID.'
                          : 'Deleted devotees will appear here so they can be restored.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.id}
                    className={
                      selectedIds.has(d.id)
                        ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                        : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelectOne(d.id)}
                        aria-label={`Select ${d.full_name}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {d.photo_url ? (
                          <button
                            type="button"
                            onClick={() => openImage(d.photo_url, d.full_name)}
                            className="h-10 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
                          >
                            <img
                              src={d.photo_url}
                              alt={d.full_name}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {(d.full_name || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {d.full_name}
                          </p>
                          {d.initiated_name && (
                            <p className="truncate text-xs font-medium text-indigo-700">
                              {d.initiated_name}
                            </p>
                          )}
                          {d.town_city && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3" /> {d.town_city}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">
                      {d.devotee_id}
                    </td>
                    <td className="px-5 py-4">
                      {d.contact_no ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {d.contact_no}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {formatDateTime(d.deleted_at)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {d.deleted_by_name || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200">
                          {d.wish_count} wish{d.wish_count === 1 ? '' : 'es'}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
                          {d.parcel_count} parcel{d.parcel_count === 1 ? '' : 's'}
                        </span>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-200">
                          {d.removal_count} removal{d.removal_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {canRestore && (
                          <button
                            type="button"
                            onClick={() => handleRestore(d)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        )}
                        {canDeleteForever && (
                          <button
                            type="button"
                            onClick={() => handleDeleteForever(d)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Forever
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

        {!loading && !canDeleteForever && filtered.length > 0 && (
          <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50/70 px-5 py-3 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Only an admin can permanently delete records from the Recycle Bin.
          </div>
        )}
      </div>
    </div>
  );
}
