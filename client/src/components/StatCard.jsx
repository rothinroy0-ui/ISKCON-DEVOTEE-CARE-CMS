import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, accent = 'indigo' }) {
  const accentMap = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ring-1 ${accentMap[accent] || accentMap.indigo}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
