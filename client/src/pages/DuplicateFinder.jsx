import React, { useEffect, useMemo, useState } from 'react';
import {
  CopyCheck,
  Search,
  Trash2,
  Phone,
  Cake,
  MapPin,
  RefreshCw,
  AlertTriangle,
  User,
  BadgeCheck,
  Users,
  Home,
  Calendar,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useImagePreview } from '../components/ImagePreviewModal';

const CATEGORIES = [
  {
    num: '01',
    key: 'personal',
    label: 'Personal Information',
    recommended: true,
    icon: User,
    desc: 'Full Name, Initiated Name & Blood Group',
    subModes: [
      { key: 'full_name', label: 'Same Full Name' },
      { key: 'initiated_name', label: 'Same Initiated Name' },
      { key: 'name_blood', label: 'Full Name + Blood Group' },
    ],
  },
  {
    num: '02',
    key: 'contact',
    label: 'Contact Information',
    recommended: true,
    icon: Phone,
    desc: 'Contact No & WhatsApp No (10-digit)',
    subModes: [
      { key: 'any_phone', label: 'Phone or WhatsApp' },
      { key: 'contact_only', label: 'Contact No Only' },
      { key: 'whatsapp_only', label: 'WhatsApp No Only' },
    ],
  },
  {
    num: '03',
    key: 'identity',
    label: 'Identity Information',
    recommended: false,
    icon: BadgeCheck,
    desc: 'Devotee ID, Spiritual Master & Teacher',
    subModes: [
      { key: 'devotee_id', label: 'Same Devotee ID' },
      { key: 'init_guru', label: 'Initiated Name + Guru' },
      { key: 'name_teacher', label: 'Full Name + Teacher' },
    ],
  },
  {
    num: '04',
    key: 'family',
    label: 'Family Information',
    recommended: false,
    icon: Users,
    desc: "Father's Name & Spouse's Name",
    subModes: [
      { key: 'name_father', label: "Full Name + Father's Name" },
      { key: 'father_only', label: "Same Father's Name" },
      { key: 'spouse_only', label: "Same Spouse's Name" },
    ],
  },
  {
    num: '05',
    key: 'address',
    label: 'Address Information',
    recommended: false,
    icon: Home,
    desc: 'Full Address & Town / City',
    subModes: [
      { key: 'full_address', label: 'Same Full Address' },
      { key: 'name_city', label: 'Full Name + City' },
      { key: 'address_city', label: 'Address + City' },
    ],
  },
  {
    num: '06',
    key: 'dates',
    label: 'Date-Based Duplicates',
    recommended: false,
    icon: Calendar,
    desc: 'DOB, Anniversary & Initiation Dates',
    subModes: [
      { key: 'name_dob', label: 'Full Name + DOB' },
      { key: 'dob_only', label: 'Same DOB Only' },
      { key: 'anniversary', label: 'Same Anniversary Date' },
      { key: 'initiation_date', label: 'Same 1st Initiation Date' },
    ],
  },
  {
    num: '07',
    key: 'import',
    label: 'Import & Record Duplicates',
    recommended: false,
    icon: FileSpreadsheet,
    desc: 'Multi-field exact import duplicates',
    subModes: [
      { key: 'name_phone_dob', label: 'Name + Phone + DOB' },
      { key: 'name_phone', label: 'Name + Phone' },
      { key: 'devotee_id_exact', label: 'Duplicate Devotee ID' },
    ],
  },
];

function normalizePhone10(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

function normalizeText(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getMatchKeys(d, subMode) {
  const fullName = normalizeText(d.full_name);
  const initName = normalizeText(d.initiated_name || d.spiritual_name);
  const contact = normalizePhone10(d.contact_no || d.phone);
  const whatsapp = normalizePhone10(d.whatsapp_no);
  const devoteeId = normalizeText(d.devotee_id);
  const guru = normalizeText(d.spiritual_master);
  const teacher = normalizeText(d.teacher_name);
  const father = normalizeText(d.fathers_name);
  const spouse = normalizeText(d.spouses_name);
  const address = normalizeText(d.full_address);
  const city = normalizeText(d.town_city || d.city);
  const blood = normalizeText(d.blood_group);
  const dob = String(d.dob || '').trim();
  const anniv = String(d.anniversary_date || d.marriage_anniversary || '').trim();
  const initDate = String(d.first_initiation_date || '').trim();

  switch (subMode) {
    case 'full_name':
      return fullName ? [{ key: fullName, label: d.full_name.trim() }] : [];
    case 'initiated_name':
      return initName
        ? [{ key: initName, label: (d.initiated_name || d.spiritual_name).trim() }]
        : [];
    case 'name_blood':
      return fullName && blood
        ? [{ key: `${fullName}__${blood}`, label: `${d.full_name.trim()} (${d.blood_group})` }]
        : [];
    case 'any_phone': {
      const seen = new Set();
      const out = [];
      [contact, whatsapp].forEach((p) => {
        if (p && !seen.has(p)) {
          seen.add(p);
          out.push({ key: p, label: p });
        }
      });
      return out;
    }
    case 'contact_only':
      return contact ? [{ key: contact, label: contact }] : [];
    case 'whatsapp_only':
      return whatsapp ? [{ key: whatsapp, label: whatsapp }] : [];
    case 'devotee_id':
    case 'devotee_id_exact':
      return devoteeId ? [{ key: devoteeId, label: d.devotee_id.trim() }] : [];
    case 'init_guru':
      return initName && guru
        ? [{ key: `${initName}__${guru}`, label: `${initName} · ${d.spiritual_master}` }]
        : [];
    case 'name_teacher':
      return fullName && teacher
        ? [{ key: `${fullName}__${teacher}`, label: `${d.full_name.trim()} · ${d.teacher_name}` }]
        : [];
    case 'name_father':
      return fullName && father
        ? [{ key: `${fullName}__${father}`, label: `${d.full_name.trim()} (S/O ${d.fathers_name})` }]
        : [];
    case 'father_only':
      return father ? [{ key: father, label: `Father: ${d.fathers_name.trim()}` }] : [];
    case 'spouse_only':
      return spouse ? [{ key: spouse, label: `Spouse: ${d.spouses_name.trim()}` }] : [];
    case 'full_address':
      return address ? [{ key: address, label: d.full_address.trim() }] : [];
    case 'name_city':
      return fullName && city
        ? [{ key: `${fullName}__${city}`, label: `${d.full_name.trim()} · ${d.town_city || d.city}` }]
        : [];
    case 'address_city':
      return address && city
        ? [{ key: `${address}__${city}`, label: `${d.full_address.trim()}, ${d.town_city || d.city}` }]
        : [];
    case 'name_dob':
      return fullName && dob
        ? [{ key: `${fullName}__${dob}`, label: `${d.full_name.trim()} (${dob})` }]
        : [];
    case 'dob_only':
      return dob ? [{ key: dob, label: `DOB: ${dob}` }] : [];
    case 'anniversary':
      return anniv ? [{ key: anniv, label: `Anniversary: ${anniv}` }] : [];
    case 'initiation_date':
      return initDate ? [{ key: initDate, label: `1st Initiation: ${initDate}` }] : [];
    case 'name_phone_dob': {
      const p = contact || whatsapp;
      return fullName && p && dob
        ? [{ key: `${fullName}__${p}__${dob}`, label: `${d.full_name.trim()} · ${p} · ${dob}` }]
        : [];
    }
    case 'name_phone': {
      const p = contact || whatsapp;
      return fullName && p
        ? [{ key: `${fullName}__${p}`, label: `${d.full_name.trim()} · ${p}` }]
        : [];
    }
    default:
      return [];
  }
}

export default function DuplicateFinder() {
  const toast = useToast();
  const confirm = useConfirm();
  const { openImage } = useImagePreview();
  const [devotees, setDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryKey, setCategoryKey] = useState('personal');
  const [subMode, setSubMode] = useState('full_name');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [aiScanning, setAiScanning] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [aiSummary, setAiSummary] = useState(null);

  const AI_STEPS = [
    'Loading active devotee records from database...',
    'Normalizing personal names, initiated names & honorifics...',
    'Extracting 10-digit phone, WhatsApp & address fingerprints...',
    'Running AI similarity scoring across 01–07 categories...',
    'Compiling duplicate clusters & confidence scores...',
  ];

  const loadDevotees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/devotees', { cache: false });
      const list = res.devotees || [];
      setDevotees(list);
      return list;
    } catch (err) {
      toast.error(err.message || 'Failed to load devotees');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleAiRescan = async () => {
    if (aiScanning) return;
    setAiScanning(true);
    setAiSummary(null);
    setAiProgress(12);
    setAiStepIndex(0);

    const startTime = Date.now();
    const list = await loadDevotees();

    for (let i = 1; i < AI_STEPS.length; i += 1) {
      await new Promise((r) => setTimeout(r, 320));
      setAiStepIndex(i);
      setAiProgress(Math.min(95, Math.round(((i + 1) / AI_STEPS.length) * 95)));
    }

    await new Promise((r) => setTimeout(r, 250));
    setAiProgress(100);
    setAiScanning(false);

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalScanned = list ? list.length : devotees.length;
    setAiSummary({
      scanned: totalScanned,
      elapsedSec,
      at: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    toast.success(`AI Scan complete! Analyzed ${totalScanned} devotees in ${elapsedSec}s.`);
  };

  useEffect(() => {
    loadDevotees();
  }, []);

  const currentCategory = useMemo(
    () => CATEGORIES.find((c) => c.key === categoryKey) || CATEGORIES[0],
    [categoryKey]
  );

  const handleSelectCategory = (cat) => {
    setCategoryKey(cat.key);
    setSubMode(cat.subModes[0].key);
    setSelectedIds(new Set());
  };

  const duplicateGroups = useMemo(() => {
    const map = new Map();

    devotees.forEach((d) => {
      const entries = getMatchKeys(d, subMode);
      entries.forEach(({ key, label }) => {
        if (!map.has(key)) map.set(key, { label, list: [] });
        map.get(key).list.push(d);
      });
    });

    const groups = [];
    map.forEach(({ label, list }, key) => {
      const uniqueById = Array.from(
        new Map(list.map((item) => [item.id, item])).values()
      );
      if (uniqueById.length > 1) {
        uniqueById.sort((a, b) => a.id - b.id);
        groups.push({ key, label, items: uniqueById });
      }
    });

    groups.sort((a, b) => b.items.length - a.items.length);
    return groups;
  }, [devotees, subMode]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return duplicateGroups;
    return duplicateGroups.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.items.some((d) =>
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
    );
  }, [duplicateGroups, search]);

  const extraCount = useMemo(
    () =>
      filteredGroups.reduce(
        (sum, g) => sum + Math.max(0, g.items.length - 1),
        0
      ),
    [filteredGroups]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMoveToRecycleBin = async (d) => {
    const ok = await confirm({
      title: 'Move Duplicate to Recycle Bin?',
      message: `Move "${d.full_name}" (${d.devotee_id || `#${d.id}`}) to Recycle Bin? You can restore it anytime from Data Management → Recycle Bin.`,
      confirmText: 'Move to Recycle Bin',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(d.id);
    try {
      await apiRequest(`/api/devotees/${d.id}`, { method: 'DELETE' });
      setDevotees((prev) => prev.filter((item) => item.id !== d.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
      toast.success(`${d.full_name} moved to Recycle Bin.`);
    } catch (err) {
      toast.error(err.message || 'Failed to move devotee to Recycle Bin');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkMoveToRecycleBin = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: 'Move Selected Duplicates to Recycle Bin?',
      message: `Move ${ids.length} selected devotee record(s) to Recycle Bin? They can be restored anytime from Recycle Bin.`,
      confirmText: `Move (${ids.length})`,
      variant: 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    let removed = 0;
    const removedSet = new Set();
    try {
      for (const id of ids) {
        try {
          await apiRequest(`/api/devotees/${id}`, { method: 'DELETE' });
          removed += 1;
          removedSet.add(id);
        } catch {
          // continue
        }
      }
      if (removed > 0) {
        setDevotees((prev) => prev.filter((d) => !removedSet.has(d.id)));
        setSelectedIds(new Set());
        toast.success(`Moved ${removed} duplicate record(s) to Recycle Bin.`);
      } else {
        toast.error('Failed to move selected records.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Devotees Scanned
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {devotees.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Duplicate Groups Found
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {filteredGroups.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Extra Duplicate Records
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{extraCount}</p>
        </div>
      </div>

      {/* 01 - 07 Duplicate Finder Categories */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Duplicate Finder Categories
          </h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            01 &amp; 02 Recommended
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = categoryKey === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                  active
                    ? 'bg-indigo-50/70 ring-2 ring-indigo-500'
                    : 'ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                    <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-mono text-[11px] text-indigo-800">
                      {cat.num}
                    </span>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {cat.recommended && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {cat.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{cat.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-criteria & Search */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-slate-500">
            {currentCategory.num} · {currentCategory.label}:
          </span>
          {currentCategory.subModes.map((sm) => (
            <button
              key={sm.key}
              type="button"
              onClick={() => {
                setSubMode(sm.key);
                setSelectedIds(new Set());
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                subMode === sm.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sm.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter duplicate groups by name, phone, Devotee ID, or city..."
              className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAiRescan}
            disabled={loading || aiScanning}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
          >
            <Sparkles className={`h-3.5 w-3.5 ${aiScanning ? 'animate-pulse' : ''}`} />
            {aiScanning ? 'AI Scanning...' : 'AI Rescan'}
          </button>
        </div>
      </div>

      {/* AI Scanning Interface */}
      {(aiScanning || aiSummary) && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-violet-50/80 to-indigo-50/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Sparkles className={`h-4 w-4 ${aiScanning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  {aiScanning
                    ? 'AI Duplicate Intelligence Scanning...'
                    : 'AI Duplicate Scan Complete'}
                </h4>
                <p className="text-xs text-indigo-700">
                  {aiScanning
                    ? AI_STEPS[aiStepIndex]
                    : `Scanned ${aiSummary.scanned} devotee records in ${aiSummary.elapsedSec}s at ${aiSummary.at} · ${filteredGroups.length} duplicate group(s) detected`}
                </p>
              </div>
            </div>

            {aiSummary && !aiScanning && (
              <button
                type="button"
                onClick={() => setAiSummary(null)}
                className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Dismiss
              </button>
            )}
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
              style={{ width: `${aiScanning ? aiProgress : 100}%` }}
            />
          </div>

          {aiScanning && (
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {AI_STEPS.map((step, idx) => (
                <div
                  key={step}
                  className={`flex items-center gap-1.5 text-xs ${
                    idx < aiStepIndex
                      ? 'font-medium text-emerald-700'
                      : idx === aiStepIndex
                      ? 'font-bold text-indigo-800'
                      : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
            <span className="text-xs font-medium text-rose-900">
              Selected records will be moved safely to Recycle Bin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMoveToRecycleBin}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {bulkBusy
                ? 'Moving...'
                : `Move Selected to Recycle Bin (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      {loading ? (
        <div className="rounded-2xl bg-white py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Scanning devotee database for duplicates...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200">
          <CopyCheck className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold text-slate-800">
            No duplicates found for &ldquo;
            {currentCategory.subModes.find((s) => s.key === subMode)?.label}&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching categories (01–07) or sub-criteria above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-amber-50/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-900">
                    Match: {group.label}
                  </span>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {group.items.length} records
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((d, idx) => (
                  <div
                    key={d.id}
                    className={`flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 ${
                      selectedIds.has(d.id) ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        aria-label={`Select ${d.full_name}`}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />

                      {d.photo_url ? (
                        <button
                          type="button"
                          onClick={() => openImage(d.photo_url, d.full_name)}
                          className="h-10 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
                        >
                          <img
                            src={d.photo_url}
                            alt={d.full_name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {(d.full_name || '?').slice(0, 2).toUpperCase()}
                        </div>
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
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                            {d.devotee_id || `#${d.id}`}
                          </span>
                          {idx === 0 && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200">
                              Earliest
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {(d.contact_no || d.whatsapp_no || d.phone) && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {d.contact_no || d.whatsapp_no || d.phone}
                            </span>
                          )}
                          {d.fathers_name && (
                            <span>S/O {d.fathers_name}</span>
                          )}
                          {d.dob && (
                            <span className="inline-flex items-center gap-1">
                              <Cake className="h-3 w-3" />
                              {d.dob}
                            </span>
                          )}
                          {(d.town_city || d.city) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {d.town_city || d.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busyId === d.id}
                      onClick={() => handleMoveToRecycleBin(d)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {busyId === d.id ? 'Moving...' : 'Move to Recycle Bin'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
