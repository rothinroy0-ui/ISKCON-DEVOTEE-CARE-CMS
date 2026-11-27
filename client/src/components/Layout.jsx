import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Cake,
  Heart,
  Package,
  ArchiveX,
  Recycle,
  Wand2,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronDown,
  FolderKanban,
} from 'lucide-react';
import { hasPermission } from '../utils/permissions';

export default function Layout({
  user,
  activePage,
  onNavigate,
  onLogout,
  t,
  children,
}) {
  const [dirOpen, setDirOpen] = useState(false);
  const dirRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dirRef.current && !dirRef.current.contains(e.target)) {
        setDirOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const directoryItems = [
    { id: 'devotees', label: t.navDevotees, icon: Users, perm: 'devotees' },
    { id: 'birthdays', label: t.navBirthdays, icon: Cake, perm: 'birthdays' },
    { id: 'anniversaries', label: t.navAnniversaries, icon: Heart, perm: 'anniversaries' },
  ].filter((item) => hasPermission(user, item.perm));

  const otherNavItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard, perm: 'dashboard' },
    { id: 'parcels', label: t.navParcels, icon: Package, perm: 'parcels' },
    { id: 'removals', label: t.navRemovals, icon: ArchiveX, perm: 'removals' },
    { id: 'recycle-bin', label: t.navRecycleBin, icon: Recycle, perm: 'devotees_edit' },
    { id: 'bulk-fix', label: t.navBulkFix, icon: Wand2, perm: 'bulk_fix' },
    { id: 'insights', label: t.navInsights, icon: BarChart3, perm: 'insights' },
    { id: 'users', label: t.navUsers, icon: ShieldCheck, perm: 'users' },
  ].filter((item) => hasPermission(user, item.perm));

  const allAllowedItems = [...otherNavItems, ...directoryItems];
  const isDirectoryActive = directoryItems.some((item) => item.id === activePage);
  const activeDirectoryItem = directoryItems.find((item) => item.id === activePage);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setDirOpen(false);
          onNavigate(item.id);
        }}
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
        <nav className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-4 py-2 sm:px-8">
          {otherNavItems.slice(0, 1).map(renderNavItem)}

          {directoryItems.length > 0 && (
            <div className="relative" ref={dirRef}>
              <button
                type="button"
                onClick={() => setDirOpen((prev) => !prev)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  isDirectoryActive
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FolderKanban
                  className={`h-4 w-4 ${
                    isDirectoryActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>
                  Devotee Directory
                  {activeDirectoryItem ? ` · ${activeDirectoryItem.label}` : ''}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    dirOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dirOpen && (
                <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {directoryItems.map((item) => {
                    const Icon = item.icon;
                    const active = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDirOpen(false);
                          onNavigate(item.id);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                          active
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            active ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {otherNavItems.slice(1).map(renderNavItem)}
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative p-4 sm:p-8">
        <img
          src="/watermark.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none fixed top-1/2 left-1/2 z-0 w-72 -translate-x-1/2 -translate-y-1/2 select-none opacity-30 sm:w-96"
        />
        <div className="relative z-10 [&_.bg-white]:bg-white/85">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            {allAllowedItems.find((i) => i.id === activePage)?.label}
          </h2>
          {children}
        </div>
      </main>
    </div>
  );
}
