import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Cake,
  Heart,
  Package,
  ArchiveX,
  ClipboardCheck,
  Recycle,
  Wand2,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronDown,
  FolderKanban,
  Database,
  Megaphone,
  MessageSquareText,
  Truck,
  Sparkles,
  PhoneCall,
  CopyCheck,
  History,
  Volume2,
  VolumeX,
  Search,
  Menu,
  X,
  ChevronRight,
  Home,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../api';
import { hasPermission } from '../utils/permissions';

function playTempleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [528, 660, 792].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.08, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.72);
    });
  } catch {
    // ignore audio context errors
  }
}

function NavGroup({
  label,
  icon: GroupIcon,
  items,
  activePage,
  onNavigate,
  open,
  setOpen,
  groupRef,
}) {
  if (items.length === 0) return null;
  const activeItem = items.find((item) => item.id === activePage);

  return (
    <div className="relative" ref={groupRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          activeItem
            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <GroupIcon
          className={`h-4 w-4 ${activeItem ? 'text-indigo-600' : 'text-slate-400'}`}
        />
        <span>
          {label}
          {activeItem ? ` · ${activeItem.label}` : ''}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigate(item.id);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({
  user,
  activePage,
  onNavigate,
  onLogout,
  marquee,
  t,
  children,
}) {
  const [dirOpen, setDirOpen] = useState(false);
  const [parcelOpen, setParcelOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const [devoteePool, setDevoteePool] = useState([]);
  const [poolLoaded, setPoolLoaded] = useState(false);
  const dirRef = useRef(null);
  const parcelRef = useRef(null);
  const commRef = useRef(null);
  const dataRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dirRef.current && !dirRef.current.contains(e.target)) {
        setDirOpen(false);
      }
      if (parcelRef.current && !parcelRef.current.contains(e.target)) {
        setParcelOpen(false);
      }
      if (commRef.current && !commRef.current.contains(e.target)) {
        setCommOpen(false);
      }
      if (dataRef.current && !dataRef.current.contains(e.target)) {
        setDataOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setGlobalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensureDevoteePool = () => {
    if (poolLoaded || !hasPermission(user, 'devotees')) return;
    setPoolLoaded(true);
    apiRequest('/api/devotees', { cache: true })
      .then((res) => setDevoteePool(res.devotees || []))
      .catch(() => {});
  };

  const handleToggleWelcomeAudio = () => {
    if (audioPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setAudioPlaying(false);
      return;
    }

    playTempleChime();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        `Hare Krishna ${user?.name || ''}! Welcome to ISKCON Durgapur, Radhapur Devotee Care.`
      );
      utter.rate = 0.92;
      utter.pitch = 1.05;
      utter.onend = () => setAudioPlaying(false);
      utter.onerror = () => setAudioPlaying(false);
      setAudioPlaying(true);
      window.speechSynthesis.speak(utter);
    } else {
      setAudioPlaying(true);
      setTimeout(() => setAudioPlaying(false), 1800);
    }
  };

  const directoryItems = [
    { id: 'devotees', label: t.navDevotees, icon: Users, perm: 'devotees' },
    { id: 'birthdays', label: t.navBirthdays, icon: Cake, perm: 'birthdays' },
    { id: 'anniversaries', label: t.navAnniversaries, icon: Heart, perm: 'anniversaries' },
    { id: 'removals', label: t.navRemovals, icon: ArchiveX, perm: 'removals' },
    { id: 'applications', label: t.navApplications, icon: ClipboardCheck, perm: 'applications' },
  ].filter((item) => hasPermission(user, item.perm));

  const parcelItems = [
    { id: 'parcels', label: t.navParcels, icon: Package, perm: 'parcels' },
    {
      id: 'parcel-communication',
      label: t.navParcelCommunication || 'Parcel Communication',
      icon: Truck,
      perm: 'communication',
    },
  ].filter((item) => hasPermission(user, item.perm));

  const commItems = [
    {
      id: 'devotee-greetings',
      label: t.navDevoteeGreetings || 'Devotee Greetings',
      icon: Sparkles,
      perm: 'communication',
    },
    {
      id: 'devotee-calling',
      label: t.navDevoteeCalling || 'Devotee Calling',
      icon: PhoneCall,
      perm: 'communication',
    },
  ].filter((item) => hasPermission(user, item.perm));

  const dataItems = [
    { id: 'recycle-bin', label: t.navRecycleBin, icon: Recycle, perm: 'devotees_edit' },
    { id: 'bulk-fix', label: t.navBulkFix, icon: Wand2, perm: 'bulk_fix' },
    { id: 'duplicate-finder', label: t.navDuplicateFinder || 'Duplicate Devotee Finder', icon: CopyCheck, perm: 'devotees_edit' },
    { id: 'insights', label: t.navInsights, icon: BarChart3, perm: 'insights' },
    { id: 'recent-activity', label: t.navRecentActivity || 'Recent Activity Log', icon: History, perm: 'devotees_edit' },
    { id: 'marquee', label: t.navMarquee, icon: Megaphone, perm: 'devotees_edit' },
  ].filter((item) => hasPermission(user, item.perm));

  const standaloneItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard, perm: 'dashboard' },
    { id: 'users', label: t.navUsers, icon: ShieldCheck, perm: 'users' },
  ].filter((item) => hasPermission(user, item.perm));

  const standalone = (id) => standaloneItems.find((item) => item.id === id);

  const allAllowedItems = [
    ...standaloneItems,
    ...directoryItems,
    ...parcelItems,
    ...commItems,
    ...dataItems,
  ];

  const breadcrumbSection = useMemo(() => {
    if (directoryItems.some((i) => i.id === activePage)) return 'Devotee Care';
    if (parcelItems.some((i) => i.id === activePage)) return t.navParcels;
    if (commItems.some((i) => i.id === activePage))
      return 'Communication Centre';
    if (dataItems.some((i) => i.id === activePage)) return 'Data Management';
    return null;
  }, [activePage, directoryItems, parcelItems, commItems, dataItems, t.navParcels]);

  const currentPageLabel =
    allAllowedItems.find((i) => i.id === activePage)?.label || '';

  const globalResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { pages: [], devotees: [] };
    const pages = allAllowedItems
      .filter((item) => item.label.toLowerCase().includes(q))
      .slice(0, 5);
    const devotees = devoteePool
      .filter((d) =>
        [
          d.full_name,
          d.initiated_name,
          d.devotee_id,
          d.contact_no,
          d.whatsapp_no,
          d.town_city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 6);
    return { pages, devotees };
  }, [globalQuery, allAllowedItems, devoteePool]);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setDirOpen(false);
          setParcelOpen(false);
          setCommOpen(false);
          setDataOpen(false);
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
      {/* Welcome & Live Clock Bar */}
      <div className="border-b border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50/70 to-indigo-50 px-4 py-1.5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900">
              Hare Krishna, {user?.name || 'Devotee'}!
            </span>
            <span className="hidden text-amber-700 sm:inline">
              Welcome to ISKCON Durgapur
            </span>
            <button
              type="button"
              onClick={handleToggleWelcomeAudio}
              title={audioPlaying ? 'Stop Hare Krishna audio' : 'Play Hare Krishna welcome audio'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 transition ${
                audioPlaying
                  ? 'bg-amber-600 text-white ring-amber-600'
                  : 'bg-white text-amber-800 ring-amber-300 hover:bg-amber-100'
              }`}
            >
              {audioPlaying ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
              <span>{audioPlaying ? 'Playing' : 'Hare Krishna Audio'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              {now.toLocaleDateString(undefined, {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono font-semibold text-indigo-700">
              {now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

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
                <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  {t.appName}
                </h1>
                <p className="hidden truncate text-[11px] text-slate-500 sm:block">
                  {t.appSub}
                </p>
              </div>
            </button>
          </div>

          {/* Global Search */}
          <div
            ref={searchRef}
            className="relative order-3 w-full md:order-2 md:max-w-xs lg:max-w-sm"
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalQuery}
              onFocus={() => {
                ensureDevoteePool();
                setGlobalOpen(true);
              }}
              onChange={(e) => {
                ensureDevoteePool();
                setGlobalQuery(e.target.value);
                setGlobalOpen(true);
              }}
              placeholder="Global search devotees or tabs..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pr-8 pl-9 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => setGlobalQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {globalOpen && globalQuery.trim() && (
              <div className="absolute right-0 left-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {globalResults.pages.length === 0 &&
                globalResults.devotees.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-slate-500">
                    No matching tabs or devotees found.
                  </p>
                ) : (
                  <>
                    {globalResults.pages.length > 0 && (
                      <div className="mb-1.5">
                        <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Pages
                        </p>
                        {globalResults.pages.map((p) => {
                          const Icon = p.icon;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setGlobalOpen(false);
                                setGlobalQuery('');
                                setMobileMenuOpen(false);
                                onNavigate(p.id);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Icon className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {globalResults.devotees.length > 0 && (
                      <div>
                        <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Devotees
                        </p>
                        {globalResults.devotees.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setGlobalOpen(false);
                              setGlobalQuery('');
                              setMobileMenuOpen(false);
                              onNavigate('devotees');
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-800">
                                {d.full_name}
                                {d.initiated_name ? ` (${d.initiated_name})` : ''}
                              </div>
                              <div className="truncate text-[11px] text-slate-500">
                                {d.devotee_id} · {d.contact_no || d.whatsapp_no || '—'}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-indigo-600">
                              Open
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="order-2 flex shrink-0 items-center gap-3 md:order-3">
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

        {/* Desktop Navigation */}
        <nav className="hidden flex-wrap items-center gap-1 border-t border-slate-100 px-4 py-2 sm:px-8 md:flex">
          {standalone('dashboard') && renderNavItem(standalone('dashboard'))}

          <NavGroup
            label="Devotee Care"
            icon={FolderKanban}
            items={directoryItems}
            activePage={activePage}
            onNavigate={onNavigate}
            open={dirOpen}
            setOpen={setDirOpen}
            groupRef={dirRef}
          />

          <NavGroup
            label={t.navParcels}
            icon={Package}
            items={parcelItems}
            activePage={activePage}
            onNavigate={onNavigate}
            open={parcelOpen}
            setOpen={setParcelOpen}
            groupRef={parcelRef}
          />

          <NavGroup
            label="Communication Centre"
            icon={MessageSquareText}
            items={commItems}
            activePage={activePage}
            onNavigate={onNavigate}
            open={commOpen}
            setOpen={setCommOpen}
            groupRef={commRef}
          />

          <NavGroup
            label="Data Management"
            icon={Database}
            items={dataItems}
            activePage={activePage}
            onNavigate={onNavigate}
            open={dataOpen}
            setOpen={setDataOpen}
            groupRef={dataRef}
          />

          {standalone('users') && renderNavItem(standalone('users'))}
        </nav>

        {/* Mobile & Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            {[
              { title: 'Main', items: standaloneItems },
              { title: 'Devotee Care', items: directoryItems },
              { title: t.navParcels, items: parcelItems },
              { title: 'Communication Centre', items: commItems },
              { title: 'Data Management', items: dataItems },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.title}>
                  <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onNavigate(item.id);
                          }}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                            active
                              ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
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
                </div>
              ))}
          </div>
        )}

        {marquee?.enabled && marquee?.text?.trim() && (
          <div className="marquee-track overflow-hidden border-t border-amber-200/70 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 px-4 py-1.5">
            <div
              className="marquee-content inline-block whitespace-nowrap text-xs font-semibold text-rose-800"
              style={{
                animation: `${
                  marquee.behavior === 'alternate'
                    ? 'marquee-alternate'
                    : 'marquee-scroll'
                } ${
                  marquee.speed === 'slow'
                    ? 28
                    : marquee.speed === 'fast'
                    ? 10
                    : 18
                }s linear infinite`,
              }}
            >
              {marquee.text}
            </div>
          </div>
        )}
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
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500"
          >
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-200/60 hover:text-indigo-700"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>
            {activePage !== 'dashboard' && breadcrumbSection && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500">{breadcrumbSection}</span>
              </>
            )}
            {activePage !== 'dashboard' && currentPageLabel && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-indigo-700">
                  {currentPageLabel}
                </span>
              </>
            )}
          </nav>

          <h2 className="mb-5 text-lg font-bold text-slate-900">
            {currentPageLabel}
          </h2>
          {children}
        </div>
      </main>
    </div>
  );
}
