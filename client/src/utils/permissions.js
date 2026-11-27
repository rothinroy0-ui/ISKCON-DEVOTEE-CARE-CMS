export const PERMISSION_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'View main dashboard & upcoming summary' },
  { key: 'devotees', label: 'Devotees (View)', desc: 'View devotees directory & export' },
  { key: 'devotees_edit', label: 'Devotees (Add / Edit / Delete)', desc: 'Create, edit, delete & remove devotees' },
  { key: 'birthdays', label: 'Birthdays', desc: 'View Birthdays tab & export Excel/PDF' },
  { key: 'anniversaries', label: 'Anniversaries', desc: 'View Anniversaries tab & export Excel/PDF' },
  { key: 'parcels', label: 'Parcels (View & Update)', desc: 'View Parcels tab & update parcel status' },
  { key: 'removals', label: 'Removal Record', desc: 'View & restore removed records' },
  { key: 'applications', label: 'Applications (Approve / Reject)', desc: 'Review & approve pending registrations' },
  { key: 'bulk_fix', label: 'Bulk Correction', desc: 'Access one-click bulk spelling correction tool' },
  { key: 'insights', label: 'Insights', desc: 'View all-column database insights & drill-down' },
  { key: 'users', label: 'User Management', desc: 'Create, edit & manage portal users' },
];

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  admin: PERMISSION_OPTIONS.map((p) => p.key),
  editor: [
    'dashboard',
    'devotees',
    'devotees_edit',
    'birthdays',
    'anniversaries',
    'parcels',
    'removals',
  ],
  viewer: [
    'dashboard',
    'devotees',
    'birthdays',
    'anniversaries',
    'parcels',
    'removals',
  ],
};

export function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(perm);
  }
  const fallback = DEFAULT_PERMISSIONS_BY_ROLE[user.role] || [];
  return fallback.includes(perm);
}
