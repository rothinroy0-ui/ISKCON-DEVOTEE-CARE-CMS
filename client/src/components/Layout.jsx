import React from 'react';
import {
  LayoutDashboard,
  Users,
  Cake,
  Heart,
  Package,
  ArchiveX,
  BarChart3,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export default function Layout({
  user,
  activePage,
  onNavigate,
  onLogout,
  t,
  children,
}) {
  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'devotees', label: t.navDevotees, icon: Users },
    { id: 'birthdays', label: t.navBirthdays, icon: Cake },
    { id: 'anniversaries', label: t.navAnniversaries, icon: Heart },
    { id: 'parcels', label: t.navParcels, icon: Package },
    { id: 'removals', label: t.navRemovals, icon: ArchiveX },
    { id: 'insights', label: t.navInsights, icon: BarChart3 },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'users', label: t.navUsers, icon: ShieldCheck });
  }

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          active
            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <img
              src="/logo.png"
              alt="ISKCON Durgapur"
              className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{t.appName}</h1>
              <p className="hidden truncate text-[11px] text-slate-500 sm:block">{t.appSub}</p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-semibold text-slate-900">{user?.name}</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">@{user?.username}</p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:px-8">
          {navItems.map(renderNavItem)}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-8">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          {navItems.find((i) => i.id === activePage)?.label}
        </h2>
        {children}
      </main>
    </div>
  );
}
