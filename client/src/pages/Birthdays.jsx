import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cake,
  CheckCircle2,
  Phone,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Search,
  Sparkles,
  MapPin,
  ChevronDown,
  ArchiveX,
  X,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useImagePreview } from '../components/ImagePreviewModal';
import { useConfirm } from '../components/ConfirmModal';
import { exportCelebrationPdf } from '../utils/pdfExport';

export default function Birthdays({ user, t }) {
  const toast = useToast();
  const { openImage } = useImagePreview();
  const confirm = useConfirm();
  const [analytics, setAnalytics] = useState(null);
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

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [ana, dev] = await Promise.all([
        apiRequest('/api/analytics/birthdays'),
        apiRequest('/api/devotees?sort=upcoming_birthday'),
      ]);
      setAnalytics(ana);
      setAllDevotees(
        (dev.devotees || []).filter(
          (d) => !d.removed_categories?.includes('birthday')
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load birthday data');
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
      list = list.filter((d) => d.birth_month === m);
    }

    if (exactDate) {
      const parts = exactDate.split('-').map(Number);
      if (parts.length === 3) {
        const [, m, day] = parts;
        list = list.filter((d) => d.birth_month === m && d.birth_day === day);
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
        (d) => d.days_until_birthday === 0 || d.days_until_birthday === 1
      ).length,
    [allDevotees]
  );

  const toggleWish = async (d) => {
    if (!canEdit) return;
    try {
      const nextWished = !d.wished_this_year;
      await apiRequest(`/api/devotees/${d.id}/wish`, {
        method: 'POST',
        body: JSON.stringify({ wished: nextWished }),
      });
      toast.success(
        nextWished
          ? `Marked ${d.full_name} as wished!`
          : `Removed wish status for ${d.full_name}.`
      );
      await loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveFromBirthdays = async (d) => {
    if (!canEdit) return;
    const ok = await confirm({
      title: 'Remove from Birthdays?',
      message: `Are you sure you want to move "${d.full_name}" from Birthdays to Removal Record? They will still remain in the main Devotees database.`,
      confirmText: 'Yes, Remove',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/devotees/${d.id}/remove-from-tab`, {
        method: 'POST',
        body: JSON.stringify({ category: 'birthday' }),
      });
      setAllDevotees((prev) => prev.filter((item) => item.id !== d.id));
      toast.success(`${d.full_name} moved to Removal Record.`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove record');
    }
  };

  if (loading && !analytics) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading birthday analytics...
      </div>
    );
  }

  if (error && !analytics && allDevotees.length === 0) {
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

  const monthlyCounts = analytics?.monthlyCounts || [];
  const maxMonthCount = Math.max(1, ...monthlyCounts.map((m) => m.count));

  const activeMonthObj =
    selectedMonth === 'all'
      ? null
      : monthlyCounts.find((m) => m.month === Number(selectedMonth));

  const viewTitle = exactDate
    ? `Birthdays on ${exactDate}`
    : activeMonthObj
    ? `${activeMonthObj.name} Birthdays`
    : 'All Birthdays';

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const label = activeMonthObj?.name || 'All_Months';
    const rows = filteredDevotees.map((d, idx) => ({
      'SL NO': idx + 1,
      'Devotee ID': d.devotee_id || '',
      'Full Name': d.full_name || '',
      'Initiated Name': d.initiated_name || d.spiritual_name || '',
      DOB: d.dob || '',
      'Days Until': d.days_until_birthday ?? '',
      'Turning Age': d.turning_age ?? '',
      'Contact No': d.contact_no || d.phone || '',
      'WhatsApp No': d.whatsapp_no || '',
      'Town / City': d.town_city || d.city || '',
      Wished: d.wished_this_year ? 'Yes' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Birthdays');
    XLSX.writeFile(wb, `ISKCON_Durgapur_${label}_Birthdays.xlsx`);
  };

  const handleExportPdf = async () => {
    const label = activeMonthObj?.name || 'All_Months';
    await exportCelebrationPdf({
      subtitle: `${viewTitle} — Name, Birthday, Phone & Address`,
      dateColumnLabel: 'BIRTHDAY',
      filename: `ISKCON_Durgapur_${label}_Birthdays.pdf`,
      rows: filteredDevotees.map((d) => {
        const initName = (d.initiated_name || d.spiritual_name || '').trim();
        const legalName = (d.full_name || '').trim();
        const displayName = initName
          ? `${initName} (${legalName})`
          : legalName;
        const addr = (d.full_address || d.address || '').trim();
        const city = (d.town_city || d.city || '').trim();
        const fullAddr =
          addr && city && !addr.toLowerCase().includes(city.toLowerCase())
            ? `${addr}, ${city}`
            : addr || city;
        return {
          name: displayName,
          date: d.dob_iso || d.dob || '',
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
              Birthdays in View
            </span>
            <Cake className="h-4 w-4 text-indigo-600" />
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
              Search Celebration Devotees:
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

      {/* Monthly Birthday Bar Chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.monthlyChart}
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
                    ? 'bg-indigo-50 ring-2 ring-indigo-500'
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
                        ? 'bg-indigo-600'
                        : 'bg-indigo-400/80 group-hover:bg-indigo-500'
                    }`}
                  />
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isSelected ? 'text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  {m.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Celebration Devotees List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <Cake className="h-5 w-5" />
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
              {t.noData}
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
                      <span className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                        {d.birth_day ?? '—'}
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
                        {d.days_until_birthday === 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Today
                          </span>
                        )}
                        {d.days_until_birthday === 1 && (
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
                        <span>• {d.dob}</span>
                        {(d.town_city || d.city) && (
                          <span>• {d.town_city || d.city}</span>
                        )}
                        {d.turning_age !== null && (
                          <span className="font-medium text-amber-700">
                            • Turning {d.turning_age}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleWish(d)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          d.wished_this_year
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {d.wished_this_year ? t.wished : t.markWished}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromBirthdays(d)}
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
