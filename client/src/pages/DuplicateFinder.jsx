import React, { useEffect, useMemo, useState } from 'react';
import {
  CopyCheck,
  Search,
  Trash2,
  Phone,
  Mail,
  Cake,
  MapPin,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useImagePreview } from '../components/ImagePreviewModal';

const MATCH_MODES = [
  {
    key: 'phone',
    label: 'Same Phone / WhatsApp',
    desc: 'Matches last 10 digits of contact or WhatsApp number',
  },
  {
    key: 'name',
    label: 'Same Full Name',
    desc: 'Case-insensitive match on full name',
  },
  {
    key: 'name_dob',
    label: 'Same Name + DOB',
    desc: 'Strict match on both full name and date of birth',
  },
  {
    key: 'email',
    label: 'Same Email',
    desc: 'Case-insensitive match on email address',
  },
];

function normalizePhone10(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

function normalizeText(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export default function DuplicateFinder() {
  const toast = useToast();
  const confirm = useConfirm();
  const { openImage } = useImagePreview();
  const [devotees, setDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('phone');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadDevotees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/devotees', { cache: false });
      setDevotees(res.devotees || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load devotees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevotees();
  }, []);

  const duplicateGroups = useMemo(() => {
    const map = new Map();

    devotees.forEach((d) => {
      if (mode === 'phone') {
        const keys = new Set([
          normalizePhone10(d.contact_no || d.phone),
          normalizePhone10(d.whatsapp_no),
        ]);
        keys.forEach((k) => {
          if (!k) return;
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(d);
        });
      } else if (mode === 'name') {
        const name = normalizeText(d.full_name);
        if (!name) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(d);
      } else if (mode === 'name_dob') {
        const name = normalizeText(d.full_name);
        const dob = String(d.dob || '').trim();
        if (!name || !dob) return;
        const key = `${name}__${dob}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(d);
      } else if (mode === 'email') {
        const email = normalizeText(d.email);
        if (!email) return;
        if (!map.has(email)) map.set(email, []);
        map.get(email).push(d);
      }
    });

    const groups = [];
    map.forEach((list, key) => {
      // Deduplicate same devotee id if both contact_no and whatsapp_no matched
      const uniqueById = Array.from(
        new Map(list.map((item) => [item.id, item])).values()
      );
      if (uniqueById.length > 1) {
        uniqueById.sort((a, b) => a.id - b.id);
        let label = key;
        if (mode === 'name_dob') {
          const [n, dob] = key.split('__');
          label = `${n} (${dob})`;
        }
        groups.push({
          key,
          label,
          items: uniqueById,
        });
      }
    });

    groups.sort((a, b) => b.items.length - a.items.length);
    return groups;
  }, [devotees, mode]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return duplicateGroups;
    return duplicateGroups.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.items.some((d) =>
          [
            d.full_name,
            d.initiated_name,
            d.devotee_id,
            d.contact_no,
            d.whatsapp_no,
            d.email,
            d.town_city,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
    );
  }, [duplicateGroups, search]);

  const extraCount = useMemo(
    () =>
      filteredGroups.reduce(
        (sum, g) => sum + Math.max(0, g.items.length - 1),
        0
      ),
    [filteredGroups]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMoveToRecycleBin = async (d) => {
    const ok = await confirm({
      title: 'Move Duplicate to Recycle Bin?',
      message: `Move "${d.full_name}" (${d.devotee_id || `#${d.id}`}) to Recycle Bin? You can restore it anytime from Data Management → Recycle Bin.`,
      confirmText: 'Move to Recycle Bin',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(d.id);
    try {
      await apiRequest(`/api/devotees/${d.id}`, { method: 'DELETE' });
      setDevotees((prev) => prev.filter((item) => item.id !== d.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
      toast.success(`${d.full_name} moved to Recycle Bin.`);
    } catch (err) {
      toast.error(err.message || 'Failed to move devotee to Recycle Bin');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkMoveToRecycleBin = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: 'Move Selected Duplicates to Recycle Bin?',
      message: `Move ${ids.length} selected devotee record(s) to Recycle Bin? They can be restored anytime from Recycle Bin.`,
      confirmText: `Move (${ids.length})`,
      variant: 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    let removed = 0;
    const removedSet = new Set();
    try {
      for (const id of ids) {
        try {
          await apiRequest(`/api/devotees/${id}`, { method: 'DELETE' });
          removed += 1;
          removedSet.add(id);
        } catch {
          // continue
        }
      }
      if (removed > 0) {
        setDevotees((prev) => prev.filter((d) => !removedSet.has(d.id)));
        setSelectedIds(new Set());
        toast.success(`Moved ${removed} duplicate record(s) to Recycle Bin.`);
      } else {
        toast.error('Failed to move selected records.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Devotees Scanned
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {devotees.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Duplicate Groups Found
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {filteredGroups.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Extra Duplicate Records
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{extraCount}</p>
        </div>
      </div>

      {/* Match Mode Selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MATCH_MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                setSelectedIds(new Set());
              }}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                active
                  ? 'bg-indigo-50/70 ring-2 ring-indigo-500'
                  : 'ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                <CopyCheck className="h-4 w-4" />
                <span>{m.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter duplicate groups by name, phone, Devotee ID, or city..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={loadDevotees}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rescan
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
            <span className="text-xs font-medium text-rose-900">
              Selected records will be moved safely to Recycle Bin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMoveToRecycleBin}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {bulkBusy
                ? 'Moving...'
                : `Move Selected to Recycle Bin (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      {loading ? (
        <div className="rounded-2xl bg-white py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Scanning devotee database for duplicates...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200">
          <CopyCheck className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold text-slate-800">
            No duplicates found for &ldquo;
            {MATCH_MODES.find((m) => m.key === mode)?.label}&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching match modes above to check by Name, Phone, DOB, or Email.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-amber-50/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-900">
                    Match: {group.label}
                  </span>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {group.items.length} records
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((d, idx) => (
                  <div
                    key={d.id}
                    className={`flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 ${
                      selectedIds.has(d.id) ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        aria-label={`Select ${d.full_name}`}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />

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
                        <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {(d.full_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {d.full_name}
                          </span>
                          {(d.initiated_name || d.spiritual_name) && (
                            <span className="text-xs font-medium text-indigo-600">
                              ({d.initiated_name || d.spiritual_name})
                            </span>
                          )}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                            {d.devotee_id || `#${d.id}`}
                          </span>
                          {idx === 0 && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
                              Earliest
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {(d.contact_no || d.whatsapp_no || d.phone) && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {d.contact_no || d.whatsapp_no || d.phone}
                            </span>
                          )}
                          {d.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {d.email}
                            </span>
                          )}
                          {d.dob && (
                            <span className="inline-flex items-center gap-1">
                              <Cake className="h-3 w-3" />
                              {d.dob}
                            </span>
                          )}
                          {(d.town_city || d.city) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {d.town_city || d.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busyId === d.id}
                      onClick={() => handleMoveToRecycleBin(d)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {busyId === d.id ? 'Moving...' : 'Move to Recycle Bin'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
