import React, { useEffect, useMemo, useState } from 'react';
import {
  PhoneCall,
  Phone,
  MessageCircle,
  Search,
  MapPin,
  CheckCircle2,
  PhoneMissed,
  Clock,
  PhoneOff,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

const CALL_PURPOSES = [
  {
    key: 'general',
    label: 'General Care Call',
    script:
      'Hare Krishna! Calling from ISKCON Durgapur (RADHAPUR Devotee Care) to check on your wellbeing and sadhana.',
  },
  {
    key: 'birthday_anniversary',
    label: 'Birthday / Anniversary Call',
    script:
      'Hare Krishna! Calling from ISKCON Durgapur to convey warm Krishna Conscious wishes on your auspicious occasion!',
  },
  {
    key: 'parcel',
    label: 'Parcel Confirmation Call',
    script:
      'Hare Krishna! Calling from ISKCON Durgapur regarding your parcel delivery address and dispatch confirmation.',
  },
  {
    key: 'festival',
    label: 'Festival / Sunday Feast Invite',
    script:
      'Hare Krishna! Calling to warmly invite you and your family to our upcoming program & Maha Prasadam at ISKCON Durgapur.',
  },
];

const OUTCOMES = [
  {
    key: 'Connected',
    label: 'Connected',
    icon: CheckCircle2,
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
  },
  {
    key: 'No Answer',
    label: 'No Answer',
    icon: PhoneMissed,
    cls: 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100',
  },
  {
    key: 'Call Back',
    label: 'Call Back',
    icon: Clock,
    cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100',
  },
  {
    key: 'Switched Off',
    label: 'Switched Off',
    icon: PhoneOff,
    cls: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100',
  },
];

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
  const [purposeKey, setPurposeKey] = useState('general');
  const [callNote, setCallNote] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [loggingId, setLoggingId] = useState(null);
  const [callLogs, setCallLogs] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setLoading(true);
    apiRequest('/api/devotees?sort=upcoming_birthday', { cache: true })
      .then((res) => {
        setDevotees(res.devotees || []);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load devotees');
      })
      .finally(() => setLoading(false));
  }, []);

  const currentPurpose = useMemo(
    () =>
      CALL_PURPOSES.find((p) => p.key === purposeKey) || CALL_PURPOSES[0],
    [purposeKey]
  );

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
          purpose: currentPurpose.label,
          outcome,
          notes: callNote,
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
            purpose: currentPurpose.label,
            outcome,
            notes: callNote,
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
      {/* Call Purpose Cards */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Call Purpose &amp; Talking Points
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CALL_PURPOSES.map((p) => {
            const isActive = p.key === purposeKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPurposeKey(p.key)}
                className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                  isActive
                    ? 'bg-indigo-50/60 ring-2 ring-indigo-500'
                    : 'ring-slate-200 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>{p.label}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                  {p.script}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Call Script & Note */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Suggested Greeting / Script — {currentPurpose.label}
            </p>
            <p className="mt-1.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 ring-1 ring-slate-200/70">
              {currentPurpose.script}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Optional Call Note (saved with log)
            </label>
            <input
              type="text"
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="e.g. Confirmed address, will attend Sunday feast"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

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
            placeholder="Search devotee by name, Devotee ID, phone, or city..."
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
              Bulk log call outcome for selected devotees
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
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 transition ${o.cls}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Devotees Calling Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading devotees...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No matching devotees found.
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
                  <th className="px-4 py-3">Call Action</th>
                  <th className="px-4 py-3 text-right">Log Call Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, visibleCount).map((d) => {
                  const phone = d.contact_no || d.whatsapp_no || d.phone || '';
                  const waUrl = buildWhatsAppCallUrl(
                    d.whatsapp_no || d.contact_no || d.phone
                  );
                  const lastLog = callLogs[d.id];
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
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {lastLog && (
                            <span className="mr-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {lastLog.outcome} ({lastLog.time})
                            </span>
                          )}
                          {OUTCOMES.map((o) => {
                            const Icon = o.icon;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                disabled={loggingId === d.id}
                                onClick={() => handleLogOutcome(d, o.key)}
                                title={`Log ${o.label}`}
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 transition disabled:opacity-50 ${o.cls}`}
                              >
                                <Icon className="h-3 w-3" />
                                <span className="hidden xl:inline">{o.label}</span>
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
