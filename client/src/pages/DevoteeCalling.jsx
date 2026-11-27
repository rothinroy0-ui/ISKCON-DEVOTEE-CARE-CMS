import React, { useEffect, useMemo, useState } from 'react';
import {
  PhoneCall,
  Phone,
  MessageCircle,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

const OUTCOMES = [
  {
    key: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
    activeCls: 'bg-emerald-600 text-white ring-emerald-600',
  },
  {
    key: 'Pending',
    label: 'Pending',
    icon: Clock,
    cls: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100',
    activeCls: 'bg-rose-600 text-white ring-rose-600',
  },
];

const PARCEL_BADGES = {
  packed: { label: 'Dispatched', cls: 'bg-indigo-100 text-indigo-700' },
  in_transit: { label: 'In Transit', cls: 'bg-amber-100 text-amber-700' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700' },
};

function buildWhatsAppCallUrl(rawPhone) {
  const digitsOnly = String(rawPhone || '').replace(/\D/g, '');
  if (!digitsOnly || digitsOnly.length < 10) return null;
  const normalized =
    digitsOnly.length === 10
      ? `91${digitsOnly}`
      : digitsOnly.startsWith('0')
      ? `91${digitsOnly.slice(1)}`
      : digitsOnly;
  return `https://wa.me/${normalized}`;
}

export default function DevoteeCalling() {
  const toast = useToast();
  const [devotees, setDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [loggingId, setLoggingId] = useState(null);
  const [callLogs, setCallLogs] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [visibleCount, setVisibleCount] = useState(60);

  const loadParcelDevotees = () => {
    setLoading(true);
    apiRequest('/api/devotees?sort=upcoming_birthday', { cache: false })
      .then((res) => {
        setDevotees(
          (res.devotees || []).filter(
            (d) =>
              !d.removed_categories?.includes('parcel') &&
              d.gift_status &&
              d.gift_status !== 'none'
          )
        );
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load parcel devotees');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadParcelDevotees();
    const onParcelUpdated = () => loadParcelDevotees();
    window.addEventListener('cms:parcel-updated', onParcelUpdated);
    return () =>
      window.removeEventListener('cms:parcel-updated', onParcelUpdated);
  }, []);

  const cities = useMemo(() => {
    const set = new Set();
    devotees.forEach((d) => {
      const c = (d.town_city || d.city || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [devotees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devotees.filter((d) => {
      const city = (d.town_city || d.city || '').trim();
      if (cityFilter !== 'all' && city !== cityFilter) return false;
      if (!q) return true;
      const haystack = [
        d.full_name,
        d.initiated_name,
        d.spiritual_name,
        d.devotee_id,
        d.contact_no,
        d.whatsapp_no,
        d.phone,
        city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [devotees, search, cityFilter]);

  const selectableFiltered = useMemo(
    () =>
      filtered.filter((d) =>
        Boolean(d.contact_no || d.whatsapp_no || d.phone)
      ),
    [filtered]
  );

  const allSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableFiltered.forEach((d) => next.delete(d.id));
      } else {
        selectableFiltered.forEach((d) => next.add(d.id));
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

  const handleLogOutcome = async (d, outcome) => {
    const phone = d.contact_no || d.whatsapp_no || d.phone || '';
    const displayName =
      (d.initiated_name || d.spiritual_name || d.full_name || '').trim();
    setLoggingId(d.id);
    try {
      await apiRequest('/api/devotees/call-log', {
        method: 'POST',
        body: JSON.stringify({
          devoteeId: d.id,
          devoteeName: displayName,
          phone,
          purpose: 'Parcel Call',
          outcome,
        }),
      });
      setCallLogs((prev) => ({
        ...prev,
        [d.id]: {
          outcome,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      }));
      toast.success(`Logged "${outcome}" for ${displayName}`);
    } catch (err) {
      toast.error(err.message || 'Failed to log call');
    } finally {
      setLoggingId(null);
    }
  };

  const handleBulkLogOutcome = async (outcome) => {
    const targets = devotees.filter((d) => selectedIds.has(d.id));
    if (targets.length === 0) return;
    let count = 0;
    for (const d of targets) {
      const phone = d.contact_no || d.whatsapp_no || d.phone || '';
      const displayName =
        (d.initiated_name || d.spiritual_name || d.full_name || '').trim();
      try {
        await apiRequest('/api/devotees/call-log', {
          method: 'POST',
          body: JSON.stringify({
            devoteeId: d.id,
            devoteeName: displayName,
            phone,
            purpose: 'Parcel Call',
            outcome,
          }),
        });
        setCallLogs((prev) => ({
          ...prev,
          [d.id]: {
            outcome,
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        }));
        count += 1;
      } catch {
        // continue
      }
    }
    if (count > 0) {
      toast.success(`Logged "${outcome}" for ${count} selected devotee(s).`);
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Search & City Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(60);
            }}
            placeholder="Search parcel devotees by name, Devotee ID, phone, or city..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setVisibleCount(60);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
            <span className="text-xs font-medium text-indigo-900">
              Bulk log call outcome
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => handleBulkLogOutcome(o.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition ${o.cls}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Parcel Devotees Calling Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading parcel devotees...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No parcel devotees found. Click Parcel on a devotee in Birthdays or Anniversaries to add them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all devotees"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3">Devotee</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Parcel Status</th>
                  <th className="px-4 py-3">Call Action</th>
                  <th className="px-4 py-3 text-right">Log Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, visibleCount).map((d) => {
                  const phone = d.contact_no || d.whatsapp_no || d.phone || '';
                  const waUrl = buildWhatsAppCallUrl(
                    d.whatsapp_no || d.contact_no || d.phone
                  );
                  const lastLog = callLogs[d.id];
                  const parcelBadge = PARCEL_BADGES[d.gift_status];
                  return (
                    <tr
                      key={d.id}
                      className={
                        selectedIds.has(d.id)
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                          : 'hover:bg-slate-50/70'
                      }
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          disabled={!phone}
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelectOne(d.id)}
                          aria-label={`Select ${d.full_name}`}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {d.initiated_name || d.spiritual_name || d.full_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {d.initiated_name ? `${d.full_name} · ` : ''}
                          {d.devotee_id || `#${d.id}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {phone ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">No number</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.town_city || d.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {d.town_city || d.city}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parcelBadge && (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${parcelBadge.cls}`}
                          >
                            {parcelBadge.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          {phone ? (
                            <a
                              href={`tel:${phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                              Call Now
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open WhatsApp"
                              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {OUTCOMES.map((o) => {
                            const Icon = o.icon;
                            const isSelected = lastLog?.outcome === o.key;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                disabled={loggingId === d.id}
                                onClick={() => handleLogOutcome(d, o.key)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-50 ${
                                  isSelected ? o.activeCls : o.cls
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > visibleCount && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 60)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Show More ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
