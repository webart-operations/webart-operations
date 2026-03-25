// Role-Based Access Control utility

// Role hierarchy: ceo > qa > manager > am > pm > sales
export const ROLES = ['ceo', 'qa', 'manager', 'am', 'pm', 'sales'];

export const PERMISSIONS = {
  // Dashboard
  view_full_dashboard:   ['ceo', 'qa', 'manager'],
  view_am_dashboard:     ['am'],
  view_pm_dashboard:     ['pm'],
  view_sales_dashboard:  ['sales'],

  // Sales data
  view_sales_data:       ['ceo', 'qa', 'manager'],       // AM/PM/Sales cannot see others' sales data
  view_own_sales:        ['sales'],           // Sales sees only their own

  // Revenue analytics (full breakdown by team)
  view_full_revenue:     ['ceo', 'qa', 'manager'],

  // Own revenue: everyone can see their own
  view_own_revenue:      ['ceo', 'qa', 'manager', 'am', 'pm', 'sales'],

  // AM sees their team revenue (their assigned PMs)
  view_team_revenue:     ['ceo', 'qa', 'manager', 'am'],

  // Clients & Projects
  view_all_clients:      ['ceo', 'qa', 'manager'],
  view_own_clients:      ['am', 'pm'],
  reassign_projects:     ['ceo', 'qa', 'manager'],
  delete_clients:        ['ceo', 'qa', 'manager'],
  delete_projects:       ['ceo', 'qa', 'manager'],

  // Submissions
  view_submissions:      ['ceo', 'qa', 'manager', 'sales'],
  delete_submissions:    ['ceo', 'qa', 'manager'],
  submit_sales:          ['ceo', 'qa', 'manager', 'sales'],

  // QA
  view_qa_queue:         ['ceo', 'qa', 'manager'],
  audit_submissions:     ['ceo', 'qa', 'manager'],

  // Team management
  manage_team:           ['ceo', 'qa', 'manager'],

  // Form Config
  manage_config:         ['ceo', 'qa', 'manager'],

  // Documents
  upload_documents:      ['ceo', 'qa', 'manager', 'am', 'pm'],
  view_documents:        ['ceo', 'qa', 'manager', 'am', 'pm'],
};

/**
 * Check if a role has a specific permission
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export const can = (role, permission) => {
  if (!role || !permission) return false;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
};

/**
 * Navigation items with role access
 */
export const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: 'LayoutDashboard', roles: ['ceo','qa','manager','am','pm','sales'] },
  { id: 'submissions',  label: 'Submissions',     icon: 'FileText',        roles: ['ceo','qa','manager','sales'] },
  { id: 'clients',      label: 'Clients',         icon: 'Users',           roles: ['ceo','qa','manager','am','pm'] },
  { id: 'projects',     label: 'Projects',        icon: 'Briefcase',       roles: ['ceo','qa','manager','am','pm'] },
  { id: 'revenue',      label: 'Revenue',         icon: 'DollarSign',      roles: ['ceo','qa','manager','am','pm'] },
  { id: 'onboarding',   label: 'Client Onboarding', icon: 'UserPlus',        roles: ['ceo','qa','manager','am','pm'] },
  { id: 'archive',      label: 'Project Archive',  icon: 'Archive',         roles: ['ceo','qa','manager','am','pm'] },
  { id: 'log-payment',  label: 'Log Payment',     icon: 'DollarSign',      roles: ['ceo','qa','manager','am','pm'] },
  { id: 'meetings',     label: 'Meetings',        icon: 'Calendar',        roles: ['ceo','qa','manager','am','pm','sales'] },
  { id: 'sales-form',   label: 'Submission Form', icon: 'PlusCircle',      roles: ['ceo','qa','manager','sales'] },
  { id: 'audit-queue',  label: 'Audit Queue',       icon: 'ShieldCheck',     roles: ['ceo','qa','manager'] },
  { id: 'csv-import',   label: 'CSV Import',      icon: 'Upload',          roles: ['ceo','qa','manager'] },
  { id: 'config',       label: 'Form Config',     icon: 'Settings',        roles: ['ceo','qa','manager'] },
  { id: 'team',         label: 'Team',            icon: 'UserCog',         roles: ['ceo','qa','manager'] },
];
