import React, { useEffect, useRef, useState } from 'react';
import {
  UserPlus,
  IdCard,
  Wand2,
  CheckCircle2,
  Users,
  RotateCcw,
  Camera,
  Phone,
  MapPin,
  Sparkles,
  Heart,
  Droplets,
  Trash2,
  Copy,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

const INITIAL_FORM = {
  devotee_id: '',
  full_name: '',
  spouses_name: '',
  dob: '',
  gender: 'Male',
  contact_no: '',
  whatsapp_no: '',
  blood_group: '',
  town_city: '',
  full_address: '',
  teacher_name: '',
  spiritual_master: '',
  initiated_name: '',
  first_initiation_date: '',
  anniversary_date: '',
  photo_url: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

function calculateAgePreview(dobStr) {
  if (!dobStr) return null;
  const parts = dobStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (
    today.getMonth() + 1 < m ||
    (today.getMonth() + 1 === m && today.getDate() < d)
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function resizePhotoToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 420;
        const maxH = 520;
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function RegisterDevotee({ t, onNavigate }) {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState(false);
  const [error, setError] = useState('');
  const [createdDevotee, setCreatedDevotee] = useState(null);
  const fileInputRef = useRef(null);

  const fetchNextId = async () => {
    setLoadingId(true);
    try {
      const data = await apiRequest('/api/devotees/next-id');
      if (data.next_id) {
        setForm((prev) => ({ ...prev, devotee_id: data.next_id }));
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingId(false);
    }
  };

  useEffect(() => {
    fetchNextId();
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    try {
      const dataUrl = await resizePhotoToDataUrl(file);
      setForm((prev) => ({ ...prev, photo_url: dataUrl }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('/api/devotees', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setCreatedDevotee(res.devotee);
      toast.success(
        `Devotee "${res.devotee?.full_name || form.full_name}" registered & saved!`
      );
      setForm(INITIAL_FORM);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchNextId();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err.message || 'Failed to register devotee';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const agePreview = calculateAgePreview(form.dob);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Success Banner */}
      {createdDevotee && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {createdDevotee.photo_url ? (
              <img
                src={createdDevotee.photo_url}
                alt={createdDevotee.full_name}
                className="h-14 w-12 rounded-xl object-cover ring-2 ring-emerald-300"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Devotee Registered Successfully!
              </h3>
              <p className="mt-0.5 text-sm text-emerald-800">
                <span className="font-semibold">{createdDevotee.full_name}</span>
                {createdDevotee.initiated_name && (
                  <span className="text-emerald-700"> ({createdDevotee.initiated_name})</span>
                )}{' '}
                — ID:{' '}
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-300">
                  {createdDevotee.devotee_id}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreatedDevotee(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-100/60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Register Another
            </button>
            <button
              type="button"
              onClick={() => onNavigate('devotees')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Users className="h-3.5 w-3.5" />
              View All Devotees
            </button>
          </div>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white shadow-lg shadow-indigo-500/20 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="ISKCON Durgapur"
              className="h-14 w-14 rounded-2xl bg-white object-contain p-1.5 shadow-md"
            />
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-xs">
                ISKCON Durgapur
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Devotee Registration Form
              </h1>
              <p className="text-sm text-indigo-100">
                Complete personal, contact, and spiritual initiation details
              </p>
            </div>
          </div>

          {form.devotee_id && (
            <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-right backdrop-blur-sm ring-1 ring-white/25">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
                Assigned Devotee ID
              </div>
              <div className="font-mono text-lg font-bold tracking-wide text-white">
                {form.devotee_id}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Section 1: Identity, Personal Details & Passport Photo */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Identity & Personal Details
              </h2>
              <p className="text-xs text-slate-500">
                Devotee ID, full name, date of birth, blood group, and passport photo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Form Inputs (3 cols) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Devotee ID
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="e.g. ISK-DGP-0011 (leave blank for auto-ID)"
                    value={form.devotee_id}
                    onChange={(e) =>
                      setForm({ ...form, devotee_id: e.target.value.toUpperCase() })
                    }
                    className="min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 font-mono text-sm font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={fetchNextId}
                    disabled={loadingId}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Wand2 className="h-4 w-4" />
                    {loadingId ? 'Generating...' : 'Auto-Generate'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Spouse&apos;s Name
                </label>
                <input
                  type="text"
                  placeholder="Optional spouse's name"
                  value={form.spouses_name}
                  onChange={(e) => setForm({ ...form, spouses_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Date of Birth *
                  </label>
                  {agePreview !== null && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      Age: {agePreview} yrs
                    </span>
                  )}
                </div>
                <input
                  required
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Droplets className="h-3.5 w-3.5 text-rose-500" />
                    Blood Group
                  </label>
                  <select
                    value={form.blood_group}
                    onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Passport Size Photo Upload Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
              <label className="mb-2 text-xs font-bold text-slate-700">
                Upload Passport Size Photo
              </label>

              {form.photo_url ? (
                <div className="relative">
                  <img
                    src={form.photo_url}
                    alt="Passport preview"
                    className="h-40 w-32 rounded-xl object-cover shadow-md ring-2 ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, photo_url: '' });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute -top-2 -right-2 rounded-full bg-rose-600 p-1.5 text-white shadow-md hover:bg-rose-700"
                    title="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-40 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-400 shadow-xs transition hover:border-indigo-400 hover:text-indigo-600"
                >
                  <Camera className="h-8 w-8" />
                  <span className="px-2 text-[11px] font-semibold">
                    Click to Upload
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {form.photo_url ? 'Change Photo' : 'Choose JPG / PNG'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Address */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Contact & Address
              </h2>
              <p className="text-xs text-slate-500">
                Phone, WhatsApp, town/city, and full residential address
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Contact No *
              </label>
              <input
                required
                type="text"
                placeholder="+91 98XXX XXXXX"
                value={form.contact_no}
                onChange={(e) => setForm({ ...form, contact_no: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  WhatsApp No
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, whatsapp_no: prev.contact_no }))
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Copy className="h-3 w-3" /> Same as Contact
                </button>
              </div>
              <input
                type="text"
                placeholder="+91 98XXX XXXXX"
                value={form.whatsapp_no}
                onChange={(e) => setForm({ ...form, whatsapp_no: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Town / City
              </label>
              <input
                type="text"
                placeholder="e.g. Durgapur"
                value={form.town_city}
                onChange={(e) => setForm({ ...form, town_city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Full Address
              </label>
              <textarea
                rows={2}
                placeholder="House/Flat no, Street, Locality, PIN Code"
                value={form.full_address}
                onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Spiritual & Initiation Details */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Spiritual & Initiation Details
              </h2>
              <p className="text-xs text-slate-500">
                Teacher/counselor, spiritual master, initiation & anniversary dates
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Teacher Name
              </label>
              <input
                type="text"
                placeholder="Counselor / Mentor name"
                value={form.teacher_name}
                onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Spiritual Master
              </label>
              <input
                type="text"
                placeholder="Diksha Guru Maharaj"
                value={form.spiritual_master}
                onChange={(e) =>
                  setForm({ ...form, spiritual_master: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Initiated Name
              </label>
              <input
                type="text"
                placeholder="Spiritual / Initiated name"
                value={form.initiated_name}
                onChange={(e) => setForm({ ...form, initiated_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                First Initiation Date
              </label>
              <input
                type="date"
                value={form.first_initiation_date}
                onChange={(e) =>
                  setForm({ ...form, first_initiation_date: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Anniversary Date
              </label>
              <input
                type="date"
                value={form.anniversary_date}
                onChange={(e) =>
                  setForm({ ...form, anniversary_date: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setForm(INITIAL_FORM);
              if (fileInputRef.current) fileInputRef.current.value = '';
              fetchNextId();
              setError('');
            }}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {saving ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}
