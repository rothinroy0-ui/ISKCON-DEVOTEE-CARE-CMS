import React from 'react';

export default function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
          >
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-16 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-9 w-64 rounded-xl bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl bg-slate-200" />
            <div className="h-9 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-slate-50/80 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-200" />
                <div>
                  <div className="h-3.5 w-40 rounded bg-slate-200" />
                  <div className="mt-1.5 h-2.5 w-28 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-7 w-24 rounded-lg bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
