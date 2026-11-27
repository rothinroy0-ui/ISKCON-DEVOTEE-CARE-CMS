import React, { useEffect, useState } from 'react';
import {
  BarChart3,
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
} from 'lucide-react';
import { apiRequest } from '../api';

function BreakdownCard({ title, icon: Icon, iconBg, barColor, items, total, searchable = false }) {
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
              {items.length} categories · {total} devotees
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

      <div className="flex-1 space-y-2.5">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No matches</p>
        ) : (
          visible.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-700" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">
                  {item.count}{' '}
                  <span className="font-normal text-slate-400">({item.pct}%)</span>
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
            </div>
          ))
        )}
      </div>

      {filtered.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {expanded
            ? 'Show Less'
            : `Show All (${filtered.length})`}
        </button>
      )}
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/analytics/insights');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

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
              Filled vs missing count across every column in devotee_data
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
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>Filled: {col.filled}</span>
                <span>Missing: {col.missing}</span>
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
        />

        <BreakdownCard
          title="Blood Group Distribution"
          icon={Droplets}
          iconBg="bg-rose-50 text-rose-600"
          barColor="bg-rose-500"
          items={data.breakdowns?.bloodGroup || []}
          total={total}
        />

        <BreakdownCard
          title="Age Group Distribution"
          icon={Cake}
          iconBg="bg-amber-50 text-amber-600"
          barColor="bg-amber-500"
          items={data.breakdowns?.ageGroups || []}
          total={total}
        />

        <BreakdownCard
          title="Town / City Breakdown"
          icon={MapPin}
          iconBg="bg-sky-50 text-sky-600"
          barColor="bg-sky-500"
          items={data.breakdowns?.townCity || []}
          total={total}
          searchable
        />

        <BreakdownCard
          title="Teacher / Counselor Breakdown"
          icon={GraduationCap}
          iconBg="bg-violet-50 text-violet-600"
          barColor="bg-violet-500"
          items={data.breakdowns?.teacherName || []}
          total={total}
          searchable
        />

        <BreakdownCard
          title="Spiritual Master Breakdown"
          icon={Sparkles}
          iconBg="bg-emerald-50 text-emerald-600"
          barColor="bg-emerald-500"
          items={data.breakdowns?.spiritualMaster || []}
          total={total}
          searchable
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
                <div key={m.month} className="flex flex-col items-center">
                  <span className="mb-1 text-[11px] font-bold text-slate-700">
                    {m.count}
                  </span>
                  <div className="flex h-20 w-full items-end rounded-lg bg-slate-100 p-1">
                    <div
                      style={{ height: `${Math.max(pct, m.count > 0 ? 10 : 3)}%` }}
                      className="w-full rounded bg-indigo-500"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">
                    {m.shortName}
                  </span>
                </div>
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
                <div key={m.month} className="flex flex-col items-center">
                  <span className="mb-1 text-[11px] font-bold text-slate-700">
                    {m.count}
                  </span>
                  <div className="flex h-20 w-full items-end rounded-lg bg-slate-100 p-1">
                    <div
                      style={{ height: `${Math.max(pct, m.count > 0 ? 10 : 3)}%` }}
                      className="w-full rounded bg-rose-500"
                    />
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">
                    {m.shortName}
                  </span>
                </div>
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
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="text-[11px] font-semibold text-emerald-700">Wished</div>
              <div className="mt-1 text-lg font-bold text-emerald-800">
                {data.giftsAndWishes?.wishedThisYear || 0}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-[11px] font-semibold text-amber-700">Packed</div>
              <div className="mt-1 text-lg font-bold text-amber-800">
                {data.giftsAndWishes?.packed || 0}
              </div>
            </div>
            <div className="rounded-xl bg-sky-50 p-3">
              <div className="text-[11px] font-semibold text-sky-700">In Transit</div>
              <div className="mt-1 text-lg font-bold text-sky-800">
                {data.giftsAndWishes?.inTransit || 0}
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3">
              <div className="text-[11px] font-semibold text-indigo-700">Delivered</div>
              <div className="mt-1 text-lg font-bold text-indigo-800">
                {data.giftsAndWishes?.delivered || 0}
              </div>
            </div>
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
              <div className="text-[11px] font-semibold text-slate-600">Total</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {data.removals?.total || 0}
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3">
              <div className="text-[11px] font-semibold text-indigo-700">Birthdays</div>
              <div className="mt-1 text-lg font-bold text-indigo-800">
                {data.removals?.birthday || 0}
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <div className="text-[11px] font-semibold text-rose-700">Anniversaries</div>
              <div className="mt-1 text-lg font-bold text-rose-800">
                {data.removals?.anniversary || 0}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-[11px] font-semibold text-amber-700">Parcels</div>
              <div className="mt-1 text-lg font-bold text-amber-800">
                {data.removals?.parcel || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
