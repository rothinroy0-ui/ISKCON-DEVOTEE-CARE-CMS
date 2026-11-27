import React, { useEffect, useMemo, useState } from 'react';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Search,
  Send,
  Phone,
  MapPin,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

const PARCEL_TEMPLATES = [
  {
    key: 'dispatched',
    label: 'Dispatched',
    shortMessage: 'Your parcel has been dispatched',
    defaultTemplate:
      'Hare Krishna {Name}, Your parcel has been dispatched from ISKCON Durgapur (RADHAPUR Devotee Care).',
    icon: PackageCheck,
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    activeClass: 'ring-2 ring-indigo-500 bg-indigo-50/70',
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    shortMessage: 'Your parcel is on the way',
    defaultTemplate:
      'Hare Krishna {Name}, Your parcel is on the way. Thank you for your patience! — ISKCON Durgapur',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    activeClass: 'ring-2 ring-amber-500 bg-amber-50/70',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    shortMessage: 'Your parcel has been delivered',
    defaultTemplate:
      'Hare Krishna {Name}, Your parcel has been delivered. Hope you received it safely! — ISKCON Durgapur',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    activeClass: 'ring-2 ring-emerald-500 bg-emerald-50/70',
  },
  {
    key: 'returned',
    label: 'Returned',
    shortMessage: 'Your parcel has been returned',
    defaultTemplate:
      'Hare Krishna {Name}, Your parcel has been returned. Please contact ISKCON Durgapur (RADHAPUR Devotee Care) to confirm your delivery address.',
    icon: RotateCcw,
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    activeClass: 'ring-2 ring-rose-500 bg-rose-50/70',
  },
];

const GIFT_STATUS_LABELS = {
  none: { label: 'No Gift', cls: 'bg-slate-100 text-slate-600' },
  packed: { label: 'Dispatched', cls: 'bg-indigo-100 text-indigo-700' },
  in_transit: { label: 'In Transit', cls: 'bg-amber-100 text-amber-700' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function ParcelCommunication() {
  const toast = useToast();
  const [devotees, setDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('dispatched');
  const [customMessage, setCustomMessage] = useState(
    PARCEL_TEMPLATES[0].defaultTemplate
  );
  const [trackingNote, setTrackingNote] = useState('');
  const [search, setSearch] = useState('');
  const [giftFilter, setGiftFilter] = useState('all');
  const [sendingId, setSendingId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sentIds, setSentIds] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendingWaLinks, setPendingWaLinks] = useState([]);
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

  const selectedTemplate = useMemo(
    () =>
      PARCEL_TEMPLATES.find((t) => t.key === selectedKey) || PARCEL_TEMPLATES[0],
    [selectedKey]
  );

  const handleSelectTemplate = (tpl) => {
    setSelectedKey(tpl.key);
    setCustomMessage(tpl.defaultTemplate);
  };

  const buildMessageForDevotee = (d) => {
    const name =
      (d.initiated_name || d.spiritual_name || d.full_name || 'Devotee').trim();
    let msg = customMessage.replace(/\{Name\}/gi, name);
    if (trackingNote.trim()) {
      msg = `${msg}\n${trackingNote.trim()}`;
    }
    return msg;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devotees.filter((d) => {
      if (giftFilter !== 'all' && (d.gift_status || 'none') !== giftFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        d.full_name,
        d.initiated_name,
        d.spiritual_name,
        d.devotee_id,
        d.contact_no,
        d.whatsapp_no,
        d.phone,
        d.town_city,
        d.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [devotees, search, giftFilter]);

  const handleSendWhatsApp = async (d) => {
    const phone = d.whatsapp_no || d.contact_no || d.phone;
    if (!phone) {
      toast.error(`No phone or WhatsApp number for ${d.full_name}`);
      return;
    }
    const message = buildMessageForDevotee(d);
    setSendingId(d.id);
    try {
      const res = await apiRequest('/api/devotees/communicate', {
        method: 'POST',
        body: JSON.stringify({
          devoteeId: d.id,
          phone,
          message,
          category: 'parcel',
          subType: selectedTemplate.label,
        }),
      });
      const wa = res?.whatsappNotification;
      setSentIds((prev) => ({ ...prev, [d.id]: selectedTemplate.key }));
      if (wa?.autoSent) {
        toast.success(
          `Parcel "${selectedTemplate.label}" message sent to ${d.full_name}!`
        );
      } else if (wa?.waUrl) {
        toast.success(
          `Opening WhatsApp (${selectedTemplate.label}) for ${d.full_name}...`
        );
        window.open(wa.waUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp notification');
    } finally {
      setSendingId(null);
    }
  };

  const selectableFiltered = useMemo(
    () =>
      filtered.filter(
        (d) => Boolean(d.whatsapp_no || d.contact_no || d.phone)
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

  const handleBulkSend = async () => {
    const targets = devotees.filter(
      (d) =>
        selectedIds.has(d.id) &&
        Boolean(d.whatsapp_no || d.contact_no || d.phone)
    );
    if (targets.length === 0) {
      toast.error('Please select at least one devotee with a phone number.');
      return;
    }

    setBulkSending(true);
    setPendingWaLinks([]);
    let autoCount = 0;
    const manualLinks = [];

    try {
      for (const d of targets) {
        const phone = d.whatsapp_no || d.contact_no || d.phone;
        const message = buildMessageForDevotee(d);
        try {
          const res = await apiRequest('/api/devotees/communicate', {
            method: 'POST',
            body: JSON.stringify({
              devoteeId: d.id,
              phone,
              message,
              category: 'parcel',
              subType: selectedTemplate.label,
            }),
          });
          const wa = res?.whatsappNotification;
          setSentIds((prev) => ({ ...prev, [d.id]: selectedTemplate.key }));
          if (wa?.autoSent) {
            autoCount += 1;
          } else if (wa?.waUrl) {
            manualLinks.push({
              id: d.id,
              name: d.initiated_name || d.spiritual_name || d.full_name,
              phone,
              waUrl: wa.waUrl,
            });
          }
        } catch {
          // continue sending to remaining devotees
        }
      }

      if (autoCount > 0) {
        toast.success(
          `Parcel "${selectedTemplate.label}" sent automatically to ${autoCount} devotee(s)!`
        );
      }
      if (manualLinks.length === 1) {
        toast.success(
          `Opening WhatsApp (${selectedTemplate.label}) for ${manualLinks[0].name}...`
        );
        window.open(manualLinks[0].waUrl, '_blank', 'noopener,noreferrer');
      } else if (manualLinks.length > 1) {
        setPendingWaLinks(manualLinks);
        window.open(manualLinks[0].waUrl, '_blank', 'noopener,noreferrer');
        toast.success(
          `Opened first WhatsApp chat; ${manualLinks.length - 1} more link(s) ready below.`
        );
      }
      setSelectedIds(new Set());
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Parcel Status Template Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PARCEL_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          const isActive = tpl.key === selectedKey;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => handleSelectTemplate(tpl)}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                isActive
                  ? tpl.activeClass
                  : 'ring-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tpl.badgeClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tpl.label}
                </span>
                {isActive && (
                  <span className="text-[11px] font-semibold text-indigo-600">
                    Selected
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-sm font-medium text-slate-800">
                {tpl.shortMessage}
              </p>
            </button>
          );
        })}
      </div>

      {/* Message Composer */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Parcel WhatsApp Message — {selectedTemplate.label}
            </h3>
            <p className="text-xs text-slate-500">
              Use <code className="rounded bg-slate-100 px-1 py-0.5">{'{Name}'}</code> to insert the devotee&apos;s name automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomMessage(selectedTemplate.defaultTemplate)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset Template
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Message Text
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Optional Tracking / Courier Note
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Tracking ID: IND123456 (India Post)"
              value={trackingNote}
              onChange={(e) => setTrackingNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
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

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'All Parcels' },
            { value: 'packed', label: 'Dispatched' },
            { value: 'in_transit', label: 'In Transit' },
            { value: 'delivered', label: 'Delivered' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setGiftFilter(opt.value);
                setVisibleCount(60);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                giftFilter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setGiftFilter('all');
              setSelectedIds(new Set());
              setSentIds({});
              setPendingWaLinks([]);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
            <span className="text-xs font-medium text-emerald-900">
              Ready to send &ldquo;{selectedTemplate.label}&rdquo; notification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkSending}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkSend}
              disabled={bulkSending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {bulkSending
                ? 'Sending...'
                : `Send ${selectedTemplate.label} to Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {pendingWaLinks.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-amber-900">
              WhatsApp Chats Ready ({pendingWaLinks.length}) — click to open each:
            </p>
            <button
              type="button"
              onClick={() => setPendingWaLinks([])}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingWaLinks.map((item) => (
              <a
                key={item.id}
                href={item.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  setPendingWaLinks((prev) => prev.filter((x) => x.id !== item.id))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {item.name} ({item.phone})
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Devotees Table */}
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
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3">Devotee</th>
                  <th className="px-4 py-3">Phone / WhatsApp</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Parcel Status</th>
                  <th className="px-4 py-3 text-right">Send Notification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, visibleCount).map((d) => {
                  const phone = d.whatsapp_no || d.contact_no || d.phone || '';
                  const giftMeta =
                    GIFT_STATUS_LABELS[d.gift_status || 'none'] ||
                    GIFT_STATUS_LABELS.none;
                  const sentStatus = sentIds[d.id];
                  return (
                    <tr
                      key={d.id}
                      className={
                        selectedIds.has(d.id)
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
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
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
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
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${giftMeta.cls}`}
                        >
                          {giftMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {sentStatus && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Sent ({sentStatus.replace('_', ' ')})
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={!phone || sendingId === d.id}
                            onClick={() => handleSendWhatsApp(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {sendingId === d.id ? (
                              'Sending...'
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                Send {selectedTemplate.label}
                              </>
                            )}
                          </button>
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
