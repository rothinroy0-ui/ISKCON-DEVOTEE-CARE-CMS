import React, { useEffect, useMemo, useState } from 'react';
import {
  Wand2,
  Search,
  Check,
  Users,
  Eye,
  X,
  Save,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

const FIELDS = [
  {
    key: 'spiritual_master',
    label: 'Spiritual Master',
    presets: [
      'H.H. JAYAPATAKA SWAMI GURUMAHARAJ',
      'H.H. BHAKTI CHARU SWAMI GURUMAHARAJ',
      'H.H. SUBHAG SWAMI GURUMAHARAJ',
    ],
  },
  {
    key: 'initiated_name',
    label: 'Spiritual / Initiated Name',
    presets: [],
  },
  {
    key: 'teacher_name',
    label: 'Teacher / Counselor',
    presets: ['H.G Audarya Chandra Das'],
  },
  {
    key: 'town_city',
    label: 'Town / City',
    presets: ['Durgapur', 'Bankura', 'Bardhaman', 'Asansol', 'Raniganj'],
  },
  {
    key: 'blood_group',
    label: 'Blood Group',
    presets: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
  },
  {
    key: 'gender',
    label: 'Gender',
    presets: ['Male', 'Female'],
  },
];

export default function BulkCorrection() {
  const toast = useToast();
  const confirm = useConfirm();

  const [allDevotees, setAllDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeField, setActiveField] = useState('spiritual_master');
  const [mode, setMode] = useState('grouped'); // 'grouped' | 'individual'
  const [search, setSearch] = useState('');

  // Grouped bulk replace state
  const [selectedValues, setSelectedValues] = useState([]);
  const [targetValue, setTargetValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Preview modal for a group
  const [previewGroup, setPreviewGroup] = useState(null);

  // Individual inline edits map: { [devoteeId]: editedText }
  const [inlineEdits, setInlineEdits] = useState({});
  const [visibleCount, setVisibleCount] = useState(60);

  const loadDevotees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/devotees?sort=name');
      setAllDevotees(res.devotees || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load devotees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevotees();
  }, []);

  useEffect(() => {
    setSelectedValues([]);
    setTargetValue('');
    setSearch('');
    setInlineEdits({});
    setVisibleCount(60);
  }, [activeField, mode]);

  const fieldMeta = FIELDS.find((f) => f.key === activeField) || FIELDS[0];

  const groupedValues = useMemo(() => {
    const map = new Map();
    for (const d of allDevotees) {
      const raw = d[activeField] ? String(d[activeField]).trim() : '';
      const key = raw || '(Empty)';
      if (!map.has(key)) {
        map.set(key, { value: raw, display: key, devotees: [] });
      }
      map.get(key).devotees.push(d);
    }
    let list = Array.from(map.values()).sort(
      (a, b) => b.devotees.length - a.devotees.length
    );
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.display.toLowerCase().includes(q));
    }
    return list;
  }, [allDevotees, activeField, search]);

  const selectedIds = useMemo(() => {
    const set = new Set(selectedValues);
    const ids = [];
    for (const g of groupedValues) {
      if (set.has(g.display)) {
        for (const d of g.devotees) ids.push(d.id);
      }
    }
    return ids;
  }, [groupedValues, selectedValues]);

  const toggleGroup = (displayKey) => {
    setSelectedValues((prev) =>
      prev.includes(displayKey)
        ? prev.filter((k) => k !== displayKey)
        : [...prev, displayKey]
    );
  };

  const handleBulkApply = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one spelling group to fix.');
      return;
    }
    if (!targetValue.trim()) {
      toast.error('Enter or choose the corrected value.');
      return;
    }

    const ok = await confirm({
      title: 'Apply Bulk Correction?',
      message: `Update "${fieldMeta.label}" to "${targetValue.trim()}" for ${selectedIds.length} devotee(s) in Supabase?`,
      confirmText: `Yes, Update ${selectedIds.length}`,
      variant: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await apiRequest('/api/devotees/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          field: activeField,
          toValue: targetValue.trim(),
          devoteeIds: selectedIds,
        }),
      });
      toast.success(
        `Updated ${res.updatedCount} record(s) to "${targetValue.trim()}"!`
      );
      setSelectedValues([]);
      setTargetValue('');
      await loadDevotees();
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredIndividuals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allDevotees;
    return allDevotees.filter(
      (d) =>
        (d.full_name && d.full_name.toLowerCase().includes(q)) ||
        (d.initiated_name && d.initiated_name.toLowerCase().includes(q)) ||
        (d.spiritual_master && d.spiritual_master.toLowerCase().includes(q)) ||
        (d.teacher_name && d.teacher_name.toLowerCase().includes(q)) ||
        (d.town_city && d.town_city.toLowerCase().includes(q)) ||
        (d.devotee_id && d.devotee_id.toLowerCase().includes(q))
    );
  }, [allDevotees, search]);

  const handleInlineSave = async (d) => {
    const newVal =
      inlineEdits[d.id] !== undefined
        ? inlineEdits[d.id]
        : d[activeField] || '';
    try {
      await apiRequest('/api/devotees/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          field: activeField,
          toValue: newVal.trim(),
          devoteeIds: [d.id],
        }),
      });
      setAllDevotees((prev) =>
        prev.map((item) =>
          item.id === d.id ? { ...item, [activeField]: newVal.trim() } : item
        )
      );
      toast.success(`Saved ${fieldMeta.label} for ${d.full_name}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  if (loading && allDevotees.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading bulk correction tool...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Field Selector */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                One-Click Bulk Correction Tool
              </h3>
              <p className="text-xs text-slate-500">
                Fix spelling mistakes in Spiritual Master, Initiated Name,
                Teacher, City, or Blood Group in one click
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('grouped')}
              className={`rounded-lg px-3 py-1.5 transition ${
                mode === 'grouped'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulk Spelling Fix
            </button>
            <button
              type="button"
              onClick={() => setMode('individual')}
              className={`rounded-lg px-3 py-1.5 transition ${
                mode === 'individual'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Individual Edit
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveField(f.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeField === f.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'grouped' ? (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Search Spellings ({groupedValues.length} groups):
                </label>
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${fieldMeta.label}...`}
                    className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Replace Selected With (Correct Spelling):
                </label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={`Enter correct ${fieldMeta.label}...`}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={saving || selectedIds.length === 0 || !targetValue.trim()}
                  onClick={handleBulkApply}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  {saving
                    ? 'Updating...'
                    : `Fix ${selectedIds.length} Record${
                        selectedIds.length === 1 ? '' : 's'
                      } in One Click`}
                </button>
              </div>
            </div>

            {fieldMeta.presets.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Quick Presets:
                </span>
                {fieldMeta.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTargetValue(p)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grouped List */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">
              <span>
                Select one or more spellings below, then choose the correct
                value above
              </span>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedValues([])}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Clear Selection ({selectedValues.length})
                </button>
              )}
            </div>

            <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {groupedValues.map((g) => {
                const checked = selectedValues.includes(g.display);
                return (
                  <div
                    key={g.display}
                    className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition ${
                      checked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(g.display)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate text-sm font-medium text-slate-800">
                        {g.display}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        <Users className="h-3 w-3" /> {g.devotees.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewGroup(g)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Individual Quick Edit Mode */
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search devotee name, initiated name, or ID..."
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              Showing {Math.min(visibleCount, filteredIndividuals.length)} of{' '}
              {filteredIndividuals.length} devotees
            </span>
          </div>

          <div className="max-h-[580px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80">
            {filteredIndividuals.slice(0, visibleCount).map((d, idx) => {
              const currentVal = d[activeField] || '';
              const editedVal =
                inlineEdits[d.id] !== undefined ? inlineEdits[d.id] : currentVal;
              const isDirty = editedVal !== currentVal;
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-[220px] items-center gap-3">
                    <span className="w-7 shrink-0 text-center font-mono text-xs font-semibold text-slate-400">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {d.full_name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {d.devotee_id}
                        {d.town_city ? ` · ${d.town_city}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-2 sm:max-w-md">
                    <input
                      type="text"
                      value={editedVal}
                      onChange={(e) =>
                        setInlineEdits((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${fieldMeta.label}...`}
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!isDirty}
                      onClick={() => handleInlineSave(d)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredIndividuals.length > visibleCount && (
              <div className="flex items-center justify-center gap-3 bg-slate-50/80 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 60)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Show 60 More ({filteredIndividuals.length - visibleCount}{' '}
                  remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewGroup(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewGroup.display}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewGroup.devotees.length} devotees with this entry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewGroup(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-6 py-3">
              {previewGroup.devotees.map((d, idx) => (
                <div key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="mr-2 font-mono text-xs text-slate-400">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold text-slate-900">
                      {d.full_name}
                    </span>
                    {d.initiated_name && (
                      <span className="ml-1.5 text-xs text-indigo-600">
                        ({d.initiated_name})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {d.devotee_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
