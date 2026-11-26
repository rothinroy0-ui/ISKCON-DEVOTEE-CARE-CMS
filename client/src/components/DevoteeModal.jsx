import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  devotee_id: '',
  full_name: '',
  fathers_name: '',
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
  second_initiation_date: '',
  anniversary_date: '',
  photo_url: '',
  status: 'active',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

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

export default function DevoteeModal({ isOpen, onClose, onSave, devotee, t }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (devotee) {
      setForm({
        devotee_id: devotee.devotee_id || '',
        full_name: devotee.full_name || '',
        fathers_name: devotee.fathers_name || '',
        spouses_name: devotee.spouses_name || '',
        dob: devotee.dob_iso || devotee.dob || '',
        gender: devotee.gender || 'Male',
        contact_no: devotee.contact_no || devotee.phone || '',
        whatsapp_no: devotee.whatsapp_no || '',
        blood_group: devotee.blood_group || '',
        town_city: devotee.town_city || devotee.city || '',
        full_address: devotee.full_address || devotee.address || '',
        teacher_name: devotee.teacher_name || '',
        spiritual_master: devotee.spiritual_master || '',
        initiated_name: devotee.initiated_name || devotee.spiritual_name || '',
        first_initiation_date: devotee.first_initiation_date || '',
        second_initiation_date: devotee.second_initiation_date || '',
        anniversary_date: devotee.anniversary_date || '',
        photo_url: devotee.photo_url || '',
        status: devotee.status || 'active',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [devotee, isOpen]);

  if (!isOpen) return null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizePhotoToDataUrl(file);
      setForm((prev) => ({ ...prev, photo_url: dataUrl }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form, devotee?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {devotee ? t.editDevotee : t.registerDevotee}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            {form.photo_url ? (
              <div className="relative">
                <img
                  src={form.photo_url}
                  alt="Photo"
                  className="h-20 w-16 rounded-lg object-cover ring-1 ring-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photo_url: '' })}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 p-1 text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-16 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400 hover:border-indigo-400 hover:text-indigo-600"
              >
                <Camera className="h-5 w-5" />
                <span className="mt-1 text-[10px]">Photo</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Devotee ID
              </label>
              <input
                type="text"
                placeholder="e.g. ISK-DGP-0011"
                value={form.devotee_id}
                onChange={(e) => setForm({ ...form, devotee_id: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Full Name *
              </label>
              <input
                required
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Spouse&apos;s Name
              </label>
              <input
                type="text"
                value={form.spouses_name}
                onChange={(e) => setForm({ ...form, spouses_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Date of Birth *
              </label>
              <input
                required
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Blood Group
                </label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Contact No *
              </label>
              <input
                required
                type="text"
                value={form.contact_no}
                onChange={(e) => setForm({ ...form, contact_no: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                WhatsApp No
              </label>
              <input
                type="text"
                value={form.whatsapp_no}
                onChange={(e) => setForm({ ...form, whatsapp_no: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Town / City
              </label>
              <input
                type="text"
                value={form.town_city}
                onChange={(e) => setForm({ ...form, town_city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Teacher Name
              </label>
              <input
                type="text"
                value={form.teacher_name}
                onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Spiritual Master
              </label>
              <input
                type="text"
                value={form.spiritual_master}
                onChange={(e) => setForm({ ...form, spiritual_master: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Initiated Name
              </label>
              <input
                type="text"
                value={form.initiated_name}
                onChange={(e) => setForm({ ...form, initiated_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                First Initiation Date
              </label>
              <input
                type="date"
                value={form.first_initiation_date}
                onChange={(e) => setForm({ ...form, first_initiation_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Anniversary Date
              </label>
              <input
                type="date"
                value={form.anniversary_date}
                onChange={(e) => setForm({ ...form, anniversary_date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Full Address
              </label>
              <input
                type="text"
                value={form.full_address}
                onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="active">{t.active}</option>
                <option value="inactive">{t.inactive}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '...' : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
