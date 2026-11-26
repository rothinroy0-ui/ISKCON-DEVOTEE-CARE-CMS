import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package,
  Truck,
  PackageCheck,
  Gift,
  Phone,
  MapPin,
  ChevronDown,
  Search,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useImagePreview } from '../components/ImagePreviewModal';

const GIFT_OPTIONS = [
  { value: 'none', label: 'No Gift' },
  { value: 'packed', label: 'Gifts Packed' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function Parcels({ user }) {
  const toast = useToast();
  const { openImage } = useImagePreview();
  const [allDevotees, setAllDevotees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCities, setSelectedCities] = useState([]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityDropdownRef = useRef(null);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const loadDevotees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/devotees?sort=upcoming_birthday');
      setAllDevotees(res.devotees || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load parcel records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevotees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target)
      ) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cityOptions = useMemo(() => {
    const counts = new Map();
    for (const d of allDevotees) {
      const c = (d.town_city || d.city || '').trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDevotees]);

  const filteredCityOptions = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cityOptions;
    return cityOptions.filter((c) => c.name.toLowerCase().includes(q));
  }, [cityOptions, citySearch]);

  const toggleCity = (cityName) => {
    setSelectedCities((prev) =>
      prev.includes(cityName)
        ? prev.filter((c) => c !== cityName)
        : [...prev, cityName]
    );
  };

  const filteredDevotees = useMemo(() => {
    let list = allDevotees;

    if (statusFilter !== 'all') {
      list = list.filter((d) => (d.gift_status || 'none') === statusFilter);
    }

    if (selectedMonth !== 'all') {
      const m = Number(selectedMonth);
      list = list.filter((d) => d.birth_month === m);
    }

    if (selectedCities.length > 0) {
      const citySet = new Set(selectedCities);
      list = list.filter((d) =>
        citySet.has((d.town_city || d.city || '').trim())
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          (d.devotee_id && d.devotee_id.toLowerCase().includes(q)) ||
          (d.full_name && d.full_name.toLowerCase().includes(q)) ||
          (d.initiated_name && d.initiated_name.toLowerCase().includes(q)) ||
          (d.contact_no && d.contact_no.toLowerCase().includes(q)) ||
          (d.whatsapp_no && d.whatsapp_no.toLowerCase().includes(q)) ||
          (d.town_city && d.town_city.toLowerCase().includes(q)) ||
          (d.full_address && d.full_address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allDevotees, statusFilter, selectedMonth, selectedCities, search]);

  useEffect(() => {
    setVisibleCount(60);
  }, [statusFilter, selectedMonth, selectedCities, search]);

  const packedCount = useMemo(
    () => allDevotees.filter((d) => d.gift_status === 'packed').length,
    [allDevotees]
  );

  const inTransitCount = useMemo(
    () => allDevotees.filter((d) => d.gift_status === 'in_transit').length,
    [allDevotees]
  );

  const deliveredCount = useMemo(
    () => allDevotees.filter((d) => d.gift_status === 'delivered').length,
    [allDevotees]
  );

  const pendingCount = useMemo(
    () =>
      allDevotees.filter((d) => !d.gift_status || d.gift_status === 'none')
        .length,
    [allDevotees]
  );

  const updateGiftStatus = async (d, giftStatus) => {
    if (!canEdit) return;
    try {
      await apiRequest(`/api/devotees/${d.id}/gift`, {
        method: 'POST',
        body: JSON.stringify({ gift_status: giftStatus }),
      });
      setAllDevotees((prev) =>
        prev.map((item) =>
          item.id === d.id ? { ...item, gift_status: giftStatus } : item
        )
      );
      const label =
        GIFT_OPTIONS.find((o) => o.value === giftStatus)?.label || giftStatus;
      toast.success(`Parcel status for ${d.full_name} saved: ${label}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredDevotees.map((d) => ({
      'Devotee ID': d.devotee_id || '',
      'Full Name': d.full_name || '',
      'Initiated Name': d.initiated_name || d.spiritual_name || '',
      'Contact No': d.contact_no || d.phone || '',
      'WhatsApp No': d.whatsapp_no || '',
      'Town / City': d.town_city || d.city || '',
      'Full Address': d.full_address || '',
      DOB: d.dob || '',
      'Parcel Status':
        GIFT_OPTIONS.find((g) => g.value === d.gift_status)?.label || 'No Gift',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parcels');
    XLSX.writeFile(wb, 'ISKCON_Durgapur_Parcels.xlsx');
  };

  const handleExportPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(15);
    doc.text(
      `ISKCON Durgapur — Parcel Dispatch (${filteredDevotees.length})`,
      14,
      16
    );
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      startY: 27,
      head: [
        [
          'Devotee ID',
          'Name (Initiated Name)',
          'Mobile',
          'Address',
          'Parcel Status',
        ],
      ],
      body: filteredDevotees.map((d) => {
        const initName = d.initiated_name || d.spiritual_name || '';
        const nameWithInit = initName
          ? `${d.full_name || ''} (${initName})`
          : d.full_name || '';
        const addr = d.full_address || d.address || '';
        const city = d.town_city || d.city || '';
        const fullAddr = addr && city && !addr.toLowerCase().includes(city.toLowerCase())
          ? `${addr}, ${city}`
          : addr || city;
        return [
          d.devotee_id || '',
          nameWithInit,
          d.contact_no || d.phone || '',
          fullAddr,
          GIFT_OPTIONS.find((g) => g.value === d.gift_status)?.label || 'No Gift',
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save('ISKCON_Durgapur_Parcels.pdf');
  };

  if (loading && allDevotees.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading parcel tracking...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'all'
              ? 'ring-2 ring-indigo-500'
              : 'ring-slate-200/80 hover:ring-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              No Gift / Pending
            </span>
            <Gift className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {pendingCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'packed' ? 'all' : 'packed')
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'packed'
              ? 'ring-2 ring-amber-500'
              : 'ring-amber-200/80 hover:ring-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              Gifts Packed
            </span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {packedCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              statusFilter === 'in_transit' ? 'all' : 'in_transit'
            )
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'in_transit'
              ? 'ring-2 ring-sky-500'
              : 'ring-sky-200/80 hover:ring-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">
              In Transit
            </span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-700">
            {inTransitCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')
          }
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'delivered'
              ? 'ring-2 ring-emerald-500'
              : 'ring-emerald-200/80 hover:ring-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">
              Delivered
            </span>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {deliveredCount}
          </p>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              📦 Parcel Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {GIFT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              🗓️ Birthday Month:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Months</option>
              {MONTHS.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative" ref={cityDropdownRef}>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              📍 City Filter:
            </label>
            <button
              type="button"
              onClick={() => setCityDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-slate-400 focus:border-indigo-500 focus:outline-none"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">
                  {selectedCities.length === 0
                    ? 'All Cities'
                    : selectedCities.length <= 2
                    ? selectedCities.join(', ')
                    : `${selectedCities.length} cities selected`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  cityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {cityDropdownOpen && (
              <div className="absolute left-0 z-40 mt-2 w-full min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 p-2.5">
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search city (e.g. dur, ban)..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCities(filteredCityOptions.map((c) => c.name))
                    }
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCities([])}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredCityOptions.length === 0 ? (
                    <div className="px-3.5 py-4 text-center text-xs text-slate-400">
                      No matching cities
                    </div>
                  ) : (
                    filteredCityOptions.map((city) => {
                      const checked = selectedCities.includes(city.name);
                      return (
                        <label
                          key={city.name}
                          className="flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm hover:bg-slate-50"
                        >
                          <span className="flex items-center gap-2.5 text-slate-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCity(city.name)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{city.name}</span>
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {city.count}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-500">
                  {cityOptions.length} cities — click a city to add or remove it
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Search Devotees:
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, initiated name, phone, city, or PIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Parcel List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Parcel &amp; Gift Tracking ({filteredDevotees.length})
              </h3>
              <p className="text-xs text-slate-500">
                Manage packed gifts, in-transit parcels, and deliveries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filteredDevotees.length === 0}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              disabled={filteredDevotees.length === 0}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5" />
              Export PDF
            </button>
          </div>
        </div>

        {filteredDevotees.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
            No matching devotee parcel records
          </div>
        ) : (
          <div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80">
            {filteredDevotees.slice(0, visibleCount).map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
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
                    <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                      {d.full_name?.slice(0, 2).toUpperCase()}
                    </span>
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
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono text-[11px] text-slate-600">
                        {d.devotee_id}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {d.contact_no || d.phone}
                      </span>
                      {(d.town_city || d.city) && (
                        <span>• {d.town_city || d.city}</span>
                      )}
                      {d.full_address && (
                        <span className="max-w-md truncate text-slate-400">
                          • {d.full_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <select
                    value={d.gift_status || 'none'}
                    onChange={(e) => updateGiftStatus(d, e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {GIFT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {filteredDevotees.length > visibleCount && (
              <div className="flex items-center justify-center gap-3 bg-slate-50/80 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 60)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Show 60 More ({filteredDevotees.length - visibleCount} remaining)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredDevotees.length)}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Show All ({filteredDevotees.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
