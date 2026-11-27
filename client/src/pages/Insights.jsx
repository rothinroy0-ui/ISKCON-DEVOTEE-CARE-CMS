import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Sparkles,
  Droplets,
  MapPin,
  GraduationCap,
  Heart,
  Cake,
  Database,
  Package,
  ArchiveX,
  Search,
  X,
  Phone,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useImagePreview } from '../components/ImagePreviewModal';
import { exportCelebrationPdf } from '../utils/pdfExport';

function isFilled(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== '' && !['null', 'none', 'na', 'n/a', '-'].includes(s.toLowerCase());
}

function getAgeBucket(age) {
  if (age === null || age === undefined || age < 0) return 'Unknown';
  if (age < 18) return 'Under 18';
  if (age <= 25) return '18 – 25';
  if (age <= 40) return '26 – 40';
  if (age <= 60) return '41 – 60';
  return '60+';
}

function BreakdownCard({
  title,
  icon: Icon,
  iconBg,
  barColor,
  items,
  total,
  searchable = false,
  onSelectItem,
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? items.filter((i) =>
        i.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : items;

  const visible = expanded ? filtered : filtered.slice(0, 8);
  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-xl p-2 ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-400">
              {items.length} categories · click any item to view devotees
            </p>
          </div>
        </div>
      </div>

      {searchable && items.length > 8 && (
        <div className="relative mb-3">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pr-2.5 pl-8 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      <div className="flex-1 space-y-1.5">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No matches</p>
        ) : (
          visible.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectItem?.(item)}
              className="group w-full rounded-lg p-1.5 text-left transition hover:bg-slate-50"
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span
                  className="flex min-w-0 items-center gap-1 font-medium text-slate-700 group-hover:text-indigo-700"
                  title={item.label}
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="shrink-0 font-semibold text-slate-900">
                  {item.count}{' '}
                  <span className="font-normal text-slate-400">
                    ({item.pct}%)
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{
                    width: `${Math.max(3, Math.round((item.count / maxCount) * 100))}%`,
                  }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
            </button>
          ))
        )}
      </div>

      {filtered.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {expanded ? 'Show Less' : `Show All (${filtered.length})`}
        </button>
      )}
    </div>
  );
}

export default function Insights() {
  const { openImage } = useImagePreview();
  const [data, setData] = useState(null);
  const [allDevotees, setAllDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [drilldown, setDrilldown] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  const loadInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const [ins, dev] = await Promise.all([
        apiRequest('/api/analytics/insights', { cache: true }),
        apiRequest('/api/devotees?sort=name', { cache: true }),
      ]);
      setData(ins);
      setAllDevotees(dev.devotees || []);
    } catch (err) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  useEffect(() => {
    if (!drilldown) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDrilldown(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drilldown]);

  const openColumnDrilldown = (col, mode) => {
    const fieldKey =
      col.key === 'upload_your_passport_size_photo' ? 'photo_url' : col.key;
    const list = allDevotees.filter((d) => {
      const filled = isFilled(d[fieldKey]);
      return mode === 'missing' ? !filled : filled;
    });
    setModalSearch('');
    setDrilldown({
      title: `${mode === 'missing' ? 'Missing' : 'Filled'}: ${col.label}`,
      subtitle: `${list.length} devotees ${mode === 'missing' ? 'missing' : 'with'} ${col.label}`,
      list,
    });
  };

  const openCategoryDrilldown = (categoryTitle, matcher) => {
    const list = allDevotees.filter(matcher);
    setModalSearch('');
    setDrilldown({
      title: categoryTitle,
      subtitle: `${list.length} devotees`,
      list,
    });
  };

  const filteredModalList = useMemo(() => {
    if (!drilldown) return [];
    const q = modalSearch.trim().toLowerCase();
    if (!q) return drilldown.list;
    return drilldown.list.filter(
      (d) =>
        (d.devotee_id && d.devotee_id.toLowerCase().includes(q)) ||
        (d.full_name && d.full_name.toLowerCase().includes(q)) ||
        (d.initiated_name && d.initiated_name.toLowerCase().includes(q)) ||
        (d.contact_no && d.contact_no.toLowerCase().includes(q)) ||
        (d.town_city && d.town_city.toLowerCase().includes(q))
    );
  }, [drilldown, modalSearch]);

  const handleExportDrilldownPdf = async () => {
    if (!drilldown || filteredModalList.length === 0) return;
    const safeSlug = drilldown.title
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    await exportCelebrationPdf({
      subtitle: `${drilldown.title} — Name, Birthday, Phone & Address`,
      dateColumnLabel: 'BIRTHDAY',
      filename: `ISKCON_Durgapur_${safeSlug || 'Insights'}.pdf`,
      rows: filteredModalList.map((d) => {
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

  if (loading && !data) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading all column insights...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto my-8 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <button
          type="button"
          onClick={loadInsights}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const total = data.totalDevotees || 0;
  const maxBirthMonth = Math.max(
    1,
    ...(data.breakdowns?.birthMonths || []).map((m) => m.count)
  );
  const maxAnnivMonth = Math.max(
    1,
    ...(data.breakdowns?.anniversaryMonths || []).map((m) => m.count)
  );

  return (
    <div className="space-y-6">
      {/* Top KPI Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Devotees
            </span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{total}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">
              Initiated Name
            </span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-700">
            {data.initiation?.initiatedNameCount || 0}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              2nd Initiated
            </span>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {data.initiation?.secondInitiationCount || 0}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">
              Data Completeness
            </span>
            <Database className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {data.avgCompleteness || 0}%
          </p>
        </div>
      </div>

      {/* All Columns Completeness */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              All Columns Insights ({data.completeness?.length || 0} Columns)
            </h3>
            <p className="text-xs text-slate-500">
              Click <strong>Missing</strong> or <strong>Filled</strong> on any
              column to see the devotee list
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data.completeness || []).map((col) => (
            <div
              key={col.key}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold text-slate-800">
                  {col.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    col.pct >= 80
                      ? 'bg-emerald-100 text-emerald-700'
                      : col.pct >= 40
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {col.pct}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  style={{ width: `${col.pct}%` }}
                  className={`h-full rounded-full ${
                    col.pct >= 80
                      ? 'bg-emerald-500'
                      : col.pct >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => openColumnDrilldown(col, 'filled')}
                  className="rounded-md px-1.5 py-0.5 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Filled: {col.filled}
                </button>
                <button
                  type="button"
                  onClick={() => openColumnDrilldown(col, 'missing')}
                  className="rounded-md bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-200/80 transition hover:bg-rose-100"
                >
                  Missing: {col.missing}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <BreakdownCard
          title="Gender Breakdown"
          icon={Users}
          iconBg="bg-indigo-50 text-indigo-600"
          barColor="bg-indigo-500"
          items={data.breakdowns?.gender || []}
          total={total}
          onSelectItem={(item) =>
            openCategoryDrilldown(`Gender: ${item.label}`, (d) =>
              item.label === 'Not Specified'
                ? !isFilled(d.gender)
                : String(d.gender || '').trim() === item.label
            )
          }
        />

        <BreakdownCard
          title="Blood Group Distribution"
          icon={Droplets}
          iconBg="bg-rose-50 text-rose-600"
          barColor="bg-rose-500"
          items={data.breakdowns?.bloodGroup || []}
          total={total}
          onSelectItem={(item) =>
            openCategoryDrilldown(`Blood Group: ${item.label}`, (d) =>
              item.label === 'Not Specified'
                ? !isFilled(d.blood_group)
                : String(d.blood_group || '').trim().toUpperCase() ===
                  item.label
            )
          }
        />

        <BreakdownCard
          title="Age Group Distribution"
          icon={Cake}
          iconBg="bg-amber-50 text-amber-600"
          barColor="bg-amber-500"
          items={data.breakdowns?.ageGroups || []}
          total={total}
          onSelectItem={(item) =>
            openCategoryDrilldown(
              `Age Group: ${item.label}`,
              (d) => getAgeBucket(d.age) === item.label
            )
          }
        />

        <BreakdownCard
          title="Town / City Breakdown"
          icon={MapPin}
          iconBg="bg-sky-50 text-sky-600"
          barColor="bg-sky-500"
          items={data.breakdowns?.townCity || []}
          total={total}
          searchable
          onSelectItem={(item) =>
            openCategoryDrilldown(`City: ${item.label}`, (d) =>
              item.label === 'Not Specified'
                ? !isFilled(d.town_city)
                : String(d.town_city || '').trim() === item.label
            )
          }
        />

        <BreakdownCard
          title="Teacher / Counselor Breakdown"
          icon={GraduationCap}
          iconBg="bg-violet-50 text-violet-600"
          barColor="bg-violet-500"
          items={data.breakdowns?.teacherName || []}
          total={total}
          searchable
          onSelectItem={(item) =>
            openCategoryDrilldown(`Teacher: ${item.label}`, (d) =>
              item.label === 'Not Specified'
                ? !isFilled(d.teacher_name)
                : String(d.teacher_name || '').trim() === item.label
            )
          }
        />

        <BreakdownCard
          title="Spiritual Master Breakdown"
          icon={Sparkles}
          iconBg="bg-emerald-50 text-emerald-600"
          barColor="bg-emerald-500"
          items={data.breakdowns?.spiritualMaster || []}
          total={total}
          searchable
          onSelectItem={(item) =>
            openCategoryDrilldown(`Spiritual Master: ${item.label}`, (d) =>
              item.label === 'Not Specified'
                ? !isFilled(d.spiritual_master)
                : String(d.spiritual_master || '').trim() === item.label
            )
          }
        />
      </div>

      {/* Monthly Birthday & Anniversary Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Cake className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Birthdays by Month
            </h3>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {(data.breakdowns?.birthMonths || []).map((m) => {
              const pct = Math.round((m.count / maxBirthMonth) * 100);
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() =>
                    openCategoryDrilldown(
                      `Birthdays in ${m.name}`,
                      (d) => d.birth_month === m.month
                    )
                  }
                  className="group flex flex-col items-center rounded-lg p-1 transition hover:bg-indigo-50"
                >
                  <span className="mb-1 text-[11px] font-bold text-slate-700">
                    {m.count}
                  </span>
                  <div className="flex h-20 w-full items-end rounded-lg bg-slate-100 p-1">
                    <div
                      style={{ height: `${Math.max(pct, m.count > 0 ? 10 : 3)}%` }}
                      className="w-full rounded bg-indigo-500 group-hover:bg-indigo-600"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">
                    {m.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Anniversaries by Month ({data.initiation?.anniversaryCount || 0})
            </h3>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {(data.breakdowns?.anniversaryMonths || []).map((m) => {
              const pct = Math.round((m.count / maxAnnivMonth) * 100);
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() =>
                    openCategoryDrilldown(
                      `Anniversaries in ${m.name}`,
                      (d) => d.anniversary_month === m.month
                    )
                  }
                  className="group flex flex-col items-center rounded-lg p-1 transition hover:bg-rose-50"
                >
                  <span className="mb-1 text-[11px] font-bold text-slate-700">
                    {m.count}
                  </span>
                  <div className="flex h-20 w-full items-end rounded-lg bg-slate-100 p-1">
                    <div
                      style={{ height: `${Math.max(pct, m.count > 0 ? 10 : 3)}%` }}
                      className="w-full rounded bg-rose-500 group-hover:bg-rose-600"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">
                    {m.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Parcels, Wishes & Removals Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Wishes &amp; Parcel Status (This Year)
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown('Wished This Year', (d) => d.wished_this_year)
              }
              className="rounded-xl bg-emerald-50 p-3 text-left transition hover:ring-2 hover:ring-emerald-300"
            >
              <div className="text-[11px] font-semibold text-emerald-700">
                Wished
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-800">
                {data.giftsAndWishes?.wishedThisYear || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown(
                  'Dispatched',
                  (d) => d.gift_status === 'packed'
                )
              }
              className="rounded-xl bg-amber-50 p-3 text-left transition hover:ring-2 hover:ring-amber-300"
            >
              <div className="text-[11px] font-semibold text-amber-700">
                Dispatched
              </div>
              <div className="mt-1 text-lg font-bold text-amber-800">
                {data.giftsAndWishes?.packed || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown(
                  'Parcels In Transit',
                  (d) => d.gift_status === 'in_transit'
                )
              }
              className="rounded-xl bg-sky-50 p-3 text-left transition hover:ring-2 hover:ring-sky-300"
            >
              <div className="text-[11px] font-semibold text-sky-700">
                In Transit
              </div>
              <div className="mt-1 text-lg font-bold text-sky-800">
                {data.giftsAndWishes?.inTransit || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown(
                  'Parcels Delivered',
                  (d) => d.gift_status === 'delivered'
                )
              }
              className="rounded-xl bg-indigo-50 p-3 text-left transition hover:ring-2 hover:ring-indigo-300"
            >
              <div className="text-[11px] font-semibold text-indigo-700">
                Delivered
              </div>
              <div className="mt-1 text-lg font-bold text-indigo-800">
                {data.giftsAndWishes?.delivered || 0}
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-3 flex items-center gap-2">
            <ArchiveX className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Removal Record Summary
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-[11px] font-semibold text-slate-600">
                Total
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {data.removals?.total || 0}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown('Removed from Birthdays', (d) =>
                  d.removed_categories?.includes('birthday')
                )
              }
              className="rounded-xl bg-indigo-50 p-3 text-left transition hover:ring-2 hover:ring-indigo-300"
            >
              <div className="text-[11px] font-semibold text-indigo-700">
                Birthdays
              </div>
              <div className="mt-1 text-lg font-bold text-indigo-800">
                {data.removals?.birthday || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown('Removed from Anniversaries', (d) =>
                  d.removed_categories?.includes('anniversary')
                )
              }
              className="rounded-xl bg-rose-50 p-3 text-left transition hover:ring-2 hover:ring-rose-300"
            >
              <div className="text-[11px] font-semibold text-rose-700">
                Anniversaries
              </div>
              <div className="mt-1 text-lg font-bold text-rose-800">
                {data.removals?.anniversary || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                openCategoryDrilldown('Removed from Parcels', (d) =>
                  d.removed_categories?.includes('parcel')
                )
              }
              className="rounded-xl bg-amber-50 p-3 text-left transition hover:ring-2 hover:ring-amber-300"
            >
              <div className="text-[11px] font-semibold text-amber-700">
                Parcels
              </div>
              <div className="mt-1 text-lg font-bold text-amber-800">
                {data.removals?.parcel || 0}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      {drilldown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setDrilldown(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-900">
                  {drilldown.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {filteredModalList.length} devotees
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={filteredModalList.length === 0}
                  onClick={handleExportDrilldownPdf}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldown(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 px-6 py-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search by name, initiated name, ID, phone, or city..."
                  className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              {filteredModalList.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No devotees found
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredModalList.map((d, idx) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
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
                            className="h-9 w-8 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <span className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {d.full_name?.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">
                            {d.full_name}
                            {(d.initiated_name || d.spiritual_name) && (
                              <span className="ml-1.5 text-xs font-medium text-indigo-600">
                                ({d.initiated_name || d.spiritual_name})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono text-[11px]">
                              {d.devotee_id}
                            </span>
                            {d.contact_no && (
                              <span className="inline-flex items-center gap-1">
                                • <Phone className="h-3 w-3" /> {d.contact_no}
                              </span>
                            )}
                            {d.town_city && <span>• {d.town_city}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
