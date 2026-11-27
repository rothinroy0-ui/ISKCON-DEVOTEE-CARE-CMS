import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Phone,
  Plus,
  Eye,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useImagePreview } from '../components/ImagePreviewModal';
import DevoteeModal from '../components/DevoteeModal';
import ApplicationReviewModal from '../components/ApplicationReviewModal';
import { hasPermission } from '../utils/permissions';

export default function Applications({ user, t }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { openImage } = useImagePreview();

  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewApp, setReviewApp] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const canApprove = hasPermission(user, 'applications');
  const canSubmit =
    hasPermission(user, 'devotees_edit') || hasPermission(user, 'applications');

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/devotees/applications/list');
      setApplications(res.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const counts = useMemo(
    () => ({
      pending: applications.filter((a) => a.status === 'pending').length,
      approved: applications.filter((a) => a.status === 'approved').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      all: applications.length,
    }),
    [applications]
  );

  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.full_name && a.full_name.toLowerCase().includes(q)) ||
          (a.initiated_name && a.initiated_name.toLowerCase().includes(q)) ||
          (a.contact_no && a.contact_no.toLowerCase().includes(q)) ||
          (a.town_city && a.town_city.toLowerCase().includes(q)) ||
          (a.devotee_id && a.devotee_id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [applications, statusFilter, search]);

  const handleSubmitApplication = async (form) => {
    await apiRequest('/api/devotees/applications', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    toast.success('Application submitted! Pending approval.');
    await loadApplications();
  };

  const handleApprove = async (appRow) => {
    const ok = await confirm({
      title: 'Approve Application?',
      message: `Approve "${appRow.full_name}" and add them to the main Devotees database?`,
      confirmText: 'Yes, Approve',
      variant: 'warning',
    });
    if (!ok) return false;

    setActionBusy(true);
    try {
      await apiRequest(`/api/devotees/applications/${appRow.id}/approve`, {
        method: 'POST',
      });
      toast.success(`${appRow.full_name} approved and added to main database!`);
      await loadApplications();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to approve application');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (appRow) => {
    const ok = await confirm({
      title: 'Reject Application?',
      message: `Are you sure you want to reject "${appRow.full_name}"'s registration application?`,
      confirmText: 'Yes, Reject',
      variant: 'danger',
    });
    if (!ok) return false;

    setActionBusy(true);
    try {
      await apiRequest(`/api/devotees/applications/${appRow.id}/reject`, {
        method: 'POST',
      });
      toast.success(`Application for ${appRow.full_name} rejected.`);
      await loadApplications();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to reject application');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleReviewApprove = async () => {
    if (!reviewApp) return;
    const done = await handleApprove(reviewApp);
    if (done) setReviewApp(null);
  };

  const handleReviewReject = async () => {
    if (!reviewApp) return;
    const done = await handleReject(reviewApp);
    if (done) setReviewApp(null);
  };

  return (
    <div className="space-y-6">
      {/* Status KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'pending'
              ? 'ring-2 ring-amber-500'
              : 'ring-amber-200/80 hover:ring-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              Pending Approval
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {counts.pending}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'approved'
              ? 'ring-2 ring-emerald-500'
              : 'ring-emerald-200/80 hover:ring-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">
              Approved
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {counts.approved}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'rejected'
              ? 'ring-2 ring-rose-500'
              : 'ring-rose-200/80 hover:ring-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">
              Rejected
            </span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {counts.rejected}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
            statusFilter === 'all'
              ? 'ring-2 ring-indigo-500'
              : 'ring-slate-200/80 hover:ring-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              All Applications
            </span>
            <ClipboardCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{counts.all}</p>
        </button>
      </div>

      {/* Applications Table */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registration Applications ({filtered.length})
              </h3>
              <p className="text-xs text-slate-500">
                New registrations wait here until approved into the main
                database
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, city..."
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {canSubmit && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Application
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading applications...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 py-8 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
            No {statusFilter === 'all' ? '' : statusFilter} applications found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">SL NO</th>
                  <th className="px-4 py-3">Devotee</th>
                  <th className="px-4 py-3">Mobile &amp; City</th>
                  <th className="px-4 py-3">DOB &amp; Guru</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {a.photo_url ? (
                          <img
                            src={a.photo_url}
                            alt={a.full_name}
                            loading="lazy"
                            onClick={() =>
                              openImage(a.photo_url, a.full_name, a.devotee_id)
                            }
                            className="h-9 w-8 shrink-0 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <span className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {a.full_name?.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">
                            {a.full_name}
                          </div>
                          {a.initiated_name && (
                            <div className="text-xs text-indigo-600">
                              {a.initiated_name}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400">
                            Submitted{' '}
                            {a.created_at
                              ? new Date(a.created_at).toLocaleDateString()
                              : ''}
                            {a.submitted_by_name
                              ? ` by ${a.submitted_by_name}`
                              : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {a.contact_no}
                      </div>
                      {a.town_city && (
                        <div className="text-slate-400">{a.town_city}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{a.dob}</div>
                      {a.spiritual_master && (
                        <div className="max-w-[200px] truncate text-slate-400">
                          {a.spiritual_master}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          a.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : a.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3.5 text-right">
                        {a.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(a)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(a)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {a.reviewed_by_name
                              ? `by ${a.reviewed_by_name}`
                              : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DevoteeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSubmitApplication}
        devotee={null}
        t={t}
      />
    </div>
  );
}
