import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  Sparkles,
  Phone,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Search,
  MapPin,
  ChevronDown,
  ArchiveX,
  Package,
  X,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useImagePreview } from '../components/ImagePreviewModal';
import { useConfirm } from '../components/ConfirmModal';
import { exportCelebrationPdf } from '../utils/pdfExport';

const MONTHS = [
  { month: 1, name: 'January', shortName: 'Jan' },
  { month: 2, name: 'February', shortName: 'Feb' },
  { month: 3, name: 'March', shortName: 'Mar' },
  { month: 4, name: 'April', shortName: 'Apr' },
  { month: 5, name: 'May', shortName: 'May' },
  { month: 6, name: 'June', shortName: 'Jun' },
  { month: 7, name: 'July', shortName: 'Jul' },
  { month: 8, name: 'August', shortName: 'Aug' },
  { month: 9, name: 'September', shortName: 'Sep' },
  { month: 10, name: 'October', shortName: 'Oct' },
  { month: 11, name: 'November', shortName: 'Nov' },
  { month: 12, name: 'December', shortName: 'Dec' },
];

export default function Anniversaries({ user }) {
  const toast = useToast();
  const { openImage } = useImagePreview();
  const confirm = useConfirm();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const [allDevotees, setAllDevotees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [exactDate, setExactDate] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityDropdownRef = useRef(null);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const dev = await apiRequest('/api/devotees');
      const cleanName = (val) =>
        String(val || '')
          .toLowerCase()
          .replace(/[.,;:'"()\-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const isValidSpouse = (s) =>
        Boolean(s) && !['null', 'none', 'na', 'n a', 'nil'].includes(s);

      const raw = (dev.devotees || []).filter(
        (d) =>
          d.anniversary_month !== null &&
          d.anniversary_day !== null &&
          !d.removed_categories?.includes('anniversary')
      );

      const deduped = [];

      for (const d of raw) {
        const selfNames = [
          cleanName(d.full_name),
          cleanName(d.initiated_name || d.spiritual_name),
        ].filter(Boolean);
        const spouse = cleanName(d.spouses_name);

        let matchIdx = -1;
        if (selfNames.length > 0 && isValidSpouse(spouse)) {
          matchIdx = deduped.findIndex((ex) => {
            if (
              ex.anniversary_month !== d.anniversary_month ||
              ex.anniversary_day !== d.anniversary_day
            ) {
              return false;
            }
            const exSelfNames = [
              cleanName(ex.full_name),
              cleanName(ex.initiated_name || ex.spiritual_name),
            ].filter(Boolean);
            const exSpouse = cleanName(ex.spouses_name);
            if (!isValidSpouse(exSpouse)) return false;

            const dSpouseMatchesEx = exSelfNames.includes(spouse);
            const exSpouseMatchesD = selfNames.includes(exSpouse);
            return dSpouseMatchesEx && exSpouseMatchesD;
          });
        }

        if (matchIdx !== -1) {
          const existing = deduped[matchIdx];
          if (!existing.photo_url && d.photo_url) {
            deduped[matchIdx] = { ...d, partner_devotee: existing };
          } else {
            deduped[matchIdx] = { ...existing, partner_devotee: d };
          }
          continue;
        }
        deduped.push(d);
      }

      deduped.sort(
        (a, b) =>
          (a.days_until_anniversary ?? 9999) -
          (b.days_until_anniversary ?? 9999)
      );
      setAllDevotees(deduped);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load anniversary records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
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

  const monthlyCounts = useMemo(() => {
    const counts = new Map();
    for (const d of allDevotees) {
      counts.set(d.anniversary_month, (counts.get(d.anniversary_month) || 0) + 1);
    }
    return MONTHS.map((m) => ({
      ...m,
      count: counts.get(m.month) || 0,
    }));
  }, [allDevotees]);

  const maxMonthCount = useMemo(
    () => Math.max(1, ...monthlyCounts.map((m) => m.count)),
    [monthlyCounts]
  );

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

    if (selectedMonth !== 'all') {
      const m = Number(selectedMonth);
      list = list.filter((d) => d.anniversary_month === m);
    }

    if (exactDate) {
      const parts = exactDate.split('-').map(Number);
      if (parts.length === 3) {
        const [, m, day] = parts;
        list = list.filter(
          (d) => d.anniversary_month === m && d.anniversary_day === day
        );
      }
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
          (d.spouses_name && d.spouses_name.toLowerCase().includes(q)) ||
          (d.contact_no && d.contact_no.toLowerCase().includes(q)) ||
          (d.whatsapp_no && d.whatsapp_no.toLowerCase().includes(q)) ||
          (d.town_city && d.town_city.toLowerCase().includes(q)) ||
          (d.full_address && d.full_address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allDevotees, selectedMonth, exactDate, selectedCities, search]);

  useEffect(() => {
    setVisibleCount(60);
  }, [selectedMonth, exactDate, selectedCities, search]);

  const todayAndTomorrowCount = useMemo(
    () =>
      allDevotees.filter(
        (d) =>
          d.days_until_anniversary === 0 || d.days_until_anniversary === 1
      ).length,
    [allDevotees]
  );

  const handleRemoveFromAnniversaries = async (d) => {
    if (!canEdit) return;
    const ok = await confirm({
      title: 'Remove from Anniversaries?',
      message: `Are you sure you want to move "${d.full_name}" from Anniversaries to Removal Record? They will still remain in the main Devotees database.`,
      confirmText: 'Yes, Remove',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/devotees/${d.id}/remove-from-tab`, {
        method: 'POST',
        body: JSON.stringify({ category: 'anniversary' }),
      });
      setAllDevotees((prev) => prev.filter((item) => item.id !== d.id));
      toast.success(`${d.full_name} moved to Removal Record.`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove record');
    }
  };

  const handleParcelToggle = async (d) => {
    if (!canEdit) return;
    const isActive = d.gift_status && d.gift_status !== 'none';
    const nextStatus = isActive ? 'none' : 'packed';
    const ok = await confirm({
      title: isActive ? 'Clear Parcel Status?' : 'Mark Parcel as Packed?',
      message: isActive
        ? `Are you sure you want to clear the parcel status for "${d.full_name}" (set to No Gift)?`
        : `Are you sure you want to mark "${d.full_name}" as Gifts Packed?`,
      confirmText: isActive ? 'Yes, Clear' : 'Yes, Mark Packed',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/devotees/${d.id}/gift`, {
        method: 'POST',
        body: JSON.stringify({ gift_status: nextStatus }),
      });
      setAllDevotees((prev) =>
        prev.map((item) =>
          item.id === d.id ? { ...item, gift_status: nextStatus } : item
        )
      );
      toast.success(
        nextStatus === 'packed'
          ? `Parcel added for ${d.full_name} (Gifts Packed)!`
          : `Parcel cleared for ${d.full_name}.`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update parcel status');
    }
  };

  if (loading && allDevotees.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading anniversaries...
      </div>
    );
  }

  if (error && allDevotees.length === 0) {
    return (
      <div className="mx-auto my-8 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <button
          type="button"
          onClick={loadAll}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const activeMonthObj =
    selectedMonth === 'all'
      ? null
      : monthlyCounts.find((m) => m.month === Number(selectedMonth));

  const viewTitle = exactDate
    ? `Anniversaries on ${exactDate}`
    : activeMonthObj
    ? `${activeMonthObj.name} Anniversaries`
    : 'All Anniversaries';

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const label = activeMonthObj?.name || 'All_Months';
    const rows = filteredDevotees.map((d, idx) => ({
      'SL NO': idx + 1,
      'Devotee ID': d.devotee_id || '',
      'Full Name': d.full_name || '',
      'Initiated Name': d.initiated_name || d.spiritual_name || '',
      "Spouse's Name": d.spouses_name || '',
      'Anniversary Date': d.anniversary_date || '',
      'Days Until': d.days_until_anniversary ?? '',
      Years: d.anniversary_next_years ?? '',
      'Contact No': d.contact_no || d.phone || '',
      'WhatsApp No': d.whatsapp_no || '',
      'Town / City': d.town_city || d.city || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anniversaries');
    XLSX.writeFile(wb, `ISKCON_Durgapur_${label}_Anniversaries.xlsx`);
  };

  const handleExportPdf = async () => {
    const label = activeMonthObj?.name || 'All_Months';
    await exportCelebrationPdf({
      subtitle: `${viewTitle} — Name, Anniversary, Phone & Address`,
      dateColumnLabel: 'ANNIVERSARY',
      filename: `ISKCON_Durgapur_${label}_Anniversaries.pdf`,
      rows: filteredDevotees.map((d) => {
        const initName = (d.initiated_name || d.spiritual_name || '').trim();
        const legalName = (d.full_name || '').trim();
        const baseName = initName ? `${initName} (${legalName})` : legalName;
        const spouse = (d.spouses_name || '').trim();
        const displayName =
          spouse && !['null', 'none', 'na', 'n/a'].includes(spouse.toLowerCase())
            ? `${baseName}\nSpouse: ${spouse}`
            : baseName;
        const addr = (d.full_address || d.address || '').trim();
        const city = (d.town_city || d.city || '').trim();
        const fullAddr =
          addr && city && !addr.toLowerCase().includes(city.toLowerCase())
            ? `${addr}, ${city}`
            : addr || city;
        return {
          name: displayName,
          date: d.anniversary_iso || d.anniversary_date || '',
          phone: d.contact_no || d.phone || '',
          address: fullAddr,
        };
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Anniversaries in View
            </span>
            <Heart className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredDevotees.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">
              Today &amp; Tomorrow
            </span>
            <Sparkles className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {todayAndTomorrowCount}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              🗓️ Month View:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Months</option>
              {monthlyCounts.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.name} ({m.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                📅 Date View (Exact Date):
              </label>
              {exactDate && (
                <button
                  type="button"
                  onClick={() => setExactDate('')}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
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
              Search Anniversary Devotees:
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, spouse, phone, city, or PIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Anniversary Bar Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Monthly Anniversary Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Click any month bar to filter (click again to show All Months)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12 sm:gap-3">
          {monthlyCounts.map((m) => {
            const pct = Math.round((m.count / maxMonthCount) * 100);
            const isSelected = Number(selectedMonth) === m.month;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() =>
                  setSelectedMonth(isSelected ? 'all' : String(m.month))
                }
                className={`group flex flex-col items-center rounded-xl p-2 transition ${
                  isSelected
                    ? 'bg-rose-50 ring-2 ring-rose-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span className="mb-2 text-xs font-bold text-slate-700">
                  {m.count}
                </span>
                <div className="flex h-24 w-full items-end justify-center rounded-lg bg-slate-100 p-1">
                  <div
                    style={{ height: `${Math.max(pct, m.count > 0 ? 12 : 4)}%` }}
                    className={`w-full rounded-md transition-all ${
                      isSelected
                        ? 'bg-rose-600'
                        : 'bg-rose-400/80 group-hover:bg-rose-500'
                    }`}
                  />
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isSelected ? 'text-rose-700' : 'text-slate-500'
                  }`}
                >
                  {m.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Anniversary Devotees List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {viewTitle} ({filteredDevotees.length})
            </h3>
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
            No anniversary records found
          </div>
        ) : (
          <div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80">
            {filteredDevotees.slice(0, visibleCount).map((d, idx) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 shrink-0 text-center font-mono text-xs font-semibold text-slate-400">
                    {idx + 1}
                  </span>
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
                    <span className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-rose-700">
                      {d.anniversary_day ?? '—'}
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
                      {d.spouses_name && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                          Spouse: {d.spouses_name}
                        </span>
                      )}
                      {d.days_until_anniversary === 0 && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          Today
                        </span>
                      )}
                      {d.days_until_anniversary === 1 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Tomorrow
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
                      <span>• {d.anniversary_date}</span>
                      {(d.town_city || d.city) && (
                        <span>• {d.town_city || d.city}</span>
                      )}
                      {d.anniversary_next_years !== null &&
                        d.anniversary_next_years > 0 && (
                          <span className="font-medium text-rose-700">
                            • {d.anniversary_next_years} yrs
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleParcelToggle(d)}
                      title="Add or toggle Parcel status"
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        d.gift_status && d.gift_status !== 'none'
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                      {d.gift_status === 'packed'
                        ? 'Packed'
                        : d.gift_status === 'in_transit'
                        ? 'In Transit'
                        : d.gift_status === 'delivered'
                        ? 'Delivered'
                        : 'Parcel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromAnniversaries(d)}
                      title="Move to Removal Record (keeps devotee in main database)"
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <ArchiveX className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
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
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
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
