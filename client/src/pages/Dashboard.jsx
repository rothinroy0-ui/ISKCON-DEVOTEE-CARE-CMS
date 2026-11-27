import React, { useEffect, useState } from 'react';
import {
  Users,
  Cake,
  CalendarClock,
  HeartHandshake,
  CheckCircle2,
  Phone,
  Sparkles,
  History,
} from 'lucide-react';
import { apiRequest } from '../api';
import StatCard from '../components/StatCard';
import PageSkeleton from '../components/PageSkeleton';

export default function Dashboard({ user, t, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const loadAnalytics = async () => {
    try {
      const res = await apiRequest('/api/analytics/birthdays', { cache: true });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const toggleWish = async (devotee) => {
    if (!canEdit) return;
    try {
      await apiRequest(`/api/devotees/${devotee.id}/wish`, {
        method: 'POST',
        body: JSON.stringify({ wished: !devotee.wished_this_year }),
      });
      await loadAnalytics();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const summary = data?.summary || {};
  const todayList = data?.todayBirthdays || [];
  const upcomingList = data?.upcoming30Days?.filter((d) => !d.is_birthday_today) || [];
  const logs = data?.recentLogs || [];

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t.totalDevotees}
          value={summary.totalDevotees ?? 0}
          subtitle={`${t.activeDevotees}: ${summary.activeDevotees ?? 0}`}
          icon={Users}
          accent="indigo"
        />
        <StatCard
          title={t.todayBirthdays}
          value={summary.todayCount ?? 0}
          icon={Cake}
          accent="rose"
        />
        <StatCard
          title={t.upcoming7Days}
          value={summary.upcoming7Count ?? 0}
          subtitle={`${t.upcoming30Days}: ${summary.upcoming30Count ?? 0}`}
          icon={CalendarClock}
          accent="amber"
        />
        <StatCard
          title={t.wishedThisYear}
          value={summary.wishedThisYearCount ?? 0}
          icon={HeartHandshake}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Birthdays */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.todayBirthdays}</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('birthdays')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {t.navBirthdays} →
            </button>
          </div>

          {todayList.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
              {t.noData}
            </div>
          ) : (
            <div className="space-y-3">
              {todayList.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{d.full_name}</span>
                      {d.spiritual_name && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {d.spiritual_name}
                        </span>
                      )}
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        {t.turningAge.replace('{n}', d.turning_age)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {d.phone}
                      </span>
                      {d.city && <span>• {d.city}</span>}
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => toggleWish(d)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                        d.wished_this_year
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {d.wished_this_year ? t.wished : t.markWished}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming 30 Days */}
          <h4 className="mt-7 mb-3 text-sm font-bold text-slate-800">{t.upcoming30Days}</h4>
          {upcomingList.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-500">
              {t.noData}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
              {upcomingList.slice(0, 6).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {d.full_name}{' '}
                      {d.spiritual_name && (
                        <span className="text-xs font-normal text-slate-500">
                          ({d.spiritual_name})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.dob} • {d.city || d.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70">
                      {t.inDays.replace('{n}', d.days_until_birthday)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
