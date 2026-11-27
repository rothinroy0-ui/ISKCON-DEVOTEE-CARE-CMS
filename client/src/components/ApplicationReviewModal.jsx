import React from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';
import { useImagePreview } from './ImagePreviewModal';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-800">
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'rejected'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
  const Icon =
    status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${styles}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export default function ApplicationReviewModal({
  application,
  isOpen,
  onClose,
  canApprove,
  onApprove,
  onReject,
  busy,
}) {
  const { openImage } = useImagePreview();

  if (!isOpen || !application) return null;

  const a = application;
  const isPending = a.status === 'pending';
  const photo = a.photo_url || a.upload_your_passport_size_photo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Review Application</h2>
              <p className="text-xs text-slate-500">
                Check the submitted registration details before taking action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Identity */}
          <div className="flex flex-wrap items-start gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            {photo ? (
              <img
                src={photo}
                alt={a.full_name}
                onClick={() => openImage(photo, a.full_name, a.devotee_id)}
                className="h-24 w-20 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-300 transition hover:ring-2 hover:ring-indigo-400"
              />
            ) : (
              <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xl font-bold text-slate-500">
                {(a.full_name || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{a.full_name}</h3>
                <StatusBadge status={a.status} />
              </div>
              {a.initiated_name && (
                <p className="text-sm font-semibold text-indigo-700">
                  {a.initiated_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-600">
                  {a.devotee_id || 'ID will be generated'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {a.contact_no || '—'}
                </span>
                {a.town_city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {a.town_city}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Submitted{' '}
                  {formatDateTime(a.created_at)}
                  {a.submitted_by_name ? ` by ${a.submitted_by_name}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Personal details */}
          <section>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Personal Details
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Father's Name" value={a.fathers_name} />
              <Field label="Spouse's Name" value={a.spouses_name} />
              <Field label="Date of Birth" value={formatDate(a.dob)} />
              <Field label="Gender" value={a.gender} />
              <Field label="Blood Group" value={a.blood_group} />
              <Field label="Anniversary Date" value={formatDate(a.anniversary_date)} />
            </div>
          </section>

          {/* Contact & address */}
          <section>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Contact &amp; Address
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact No" value={a.contact_no} />
              <Field label="WhatsApp No" value={a.whatsapp_no} />
              <Field label="Town / City" value={a.town_city} />
              <Field label="Full Address" value={a.full_address} />
            </div>
          </section>

          {/* Spiritual details */}
          <section>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Spiritual Details
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Spiritual Master" value={a.spiritual_master} />
              <Field label="Teacher Name" value={a.teacher_name} />
              <Field label="Initiated Name" value={a.initiated_name} />
              <Field label="First Initiation Date" value={formatDate(a.first_initiation_date)} />
              <Field label="Second Initiation Date" value={formatDate(a.second_initiation_date)} />
            </div>
          </section>

          {/* Review trail */}
          {!isPending && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200/70">
              <span className="font-semibold text-slate-700">
                {a.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>{' '}
              {a.reviewed_by_name ? `by ${a.reviewed_by_name}` : ''}
              {a.reviewed_at ? ` on ${formatDateTime(a.reviewed_at)}` : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          {isPending && canApprove && (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve &amp; Add
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
