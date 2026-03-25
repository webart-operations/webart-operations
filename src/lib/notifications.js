import { supabase } from './supabase';

/**
 * Creates a notification for a specific user ID.
 */
export const notifyUser = async ({ userId, title, message, type = 'info', link = null, entityType = null, entityId = null }) => {
   if (!userId) return;
   await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      related_entity_type: entityType,
      related_entity_id: entityId
   });
};

/**
 * Broadcasts a notification to an array of specific user IDs.
 */
export const notifyUsers = async (userIds, payload) => {
   if (!userIds || !userIds.length) return;
   const inserts = userIds.map(id => ({
      user_id: id,
      ...payload
   }));
   await supabase.from('notifications').insert(inserts);
};

/**
 * Fetches user IDs for generic roles (e.g. 'ceo', 'qa') or specific names.
 */
const getIdsForRolesOrNames = async ({ roles = [], names = [], team = null }) => {
   let query = supabase.from('profiles').select('id, role, full_name, team').eq('status', 'active');
   const { data } = await query;
   if (!data) return [];

   return data.filter(p => {
      if (roles.includes(p.role)) {
         // If team is specified and the role is manager, ONLY include managers of that exact team
         if (p.role === 'manager' && team && p.team !== team) return false;
         return true; // Match by role
      }
      if (names.includes(p.full_name)) return true; // Match by exact name (e.g., Assigned AM)
      return false;
   }).map(p => p.id);
};

/**
 * Trigger Event: New Sale Submitted
 */
export const notifySaleSubmitted = async (clientName, repName) => {
   const ids = await getIdsForRolesOrNames({ roles: ['qa', 'ceo'] });
   await notifyUsers(ids, {
      title: 'New Sale Ready for Audit',
      message: `${repName} submitted a new sale for ${clientName}.`,
      type: 'info',
      link: null // Could link to Audit Queue
   });
};

/**
 * Trigger Event: QA Passed
 */
export const notifyQAPassed = async ({ clientName, repName, closerName, amName, pmName, teamName, projectId }) => {
   const ids = await getIdsForRolesOrNames({ 
      roles: ['ceo', 'manager'], // Include manager explicitly filtered by team
      names: [repName, closerName, amName, pmName].filter(Boolean),
      team: teamName // Crucial filter for the manager
   });
   
   // Deduplicate IDs (e.g. if Rep and Closer are the same person)
   const uniqueIds = [...new Set(ids)];

   await notifyUsers(uniqueIds, {
      title: 'Sale Approved',
      message: `QA passed the sale for ${clientName}. The project is now active.`,
      type: 'success',
      link: null // Could link to Project Detail
   });
};

/**
 * Trigger Event: QA Failed
 */
export const notifyQAFailed = async ({ clientName, repName, closerName }) => {
   const ids = await getIdsForRolesOrNames({ 
      names: [repName, closerName].filter(Boolean)
   });
   const uniqueIds = [...new Set(ids)];

   await notifyUsers(uniqueIds, {
      title: 'Sale Audit Failed',
      message: `QA rejected the submission for ${clientName}. Please review the notes.`,
      type: 'error'
   });
};

/**
 * Trigger Event: Payment Logged
 */
export const notifyPaymentLogged = async ({ clientName, amountFormatted, amName, pmName, loggerName, teamName }) => {
   const ids = await getIdsForRolesOrNames({ 
      roles: ['ceo', 'manager'],
      names: [amName, pmName].filter(Boolean),
      team: teamName
   });
   const uniqueIds = [...new Set(ids)];

   await notifyUsers(uniqueIds, {
      title: 'Payment Collected 💰',
      message: `${amountFormatted} was collected for ${clientName} by ${loggerName}.`,
      type: 'success'
   });
};

/**
 * Trigger Event: Project Status Change (e.g., At Risk)
 */
export const notifyProjectStatusAlert = async ({ clientName, status, amName, pmName, teamName }) => {
   const alertType = status === 'at_risk' ? 'error' : status === 'on_hold' ? 'warning' : 'info';
   const label = status.replace(/_/g, ' ').toUpperCase();

   const ids = await getIdsForRolesOrNames({ 
      roles: ['ceo', 'manager'],
      names: [amName, pmName].filter(Boolean),
      team: teamName
   });
   const uniqueIds = [...new Set(ids)];

   await notifyUsers(uniqueIds, {
      title: `Project Alert: ${label}`,
      message: `${clientName} has been flagged as ${status.replace(/_/g, ' ')}.`,
      type: alertType
   });
};

/**
 * Trigger Event: Project Reassigned / Assigned
 */
export const notifyProjectAssigned = async ({ clientName, amName, pmName, assignerName, teamName }) => {
   const ids = await getIdsForRolesOrNames({ 
      roles: ['ceo', 'manager'],
      names: [amName, pmName].filter(Boolean),
      team: teamName
   });
   const uniqueIds = [...new Set(ids)];

   await notifyUsers(uniqueIds, {
      title: 'Project Assignment Update',
      message: `${assignerName} assigned ${clientName} to AM: ${amName || '—'} | PM: ${pmName || '—'}.`,
      type: 'info'
   });
};
 
/**
 * Trigger Event: New Onboarding Submitted (AM/PM)
 */
export const notifyOnboardingSubmitted = async (clientName, amPmName) => {
   const ids = await getIdsForRolesOrNames({ roles: ['qa', 'ceo'] });
   await notifyUsers(ids, {
      title: 'New Onboarding Ready for Audit',
      message: `${amPmName} submitted a new onboarding for ${clientName}.`,
      type: 'info',
      link: null
   });
};

/**
 * Trigger Event: Onboarding Passed (AM/PM)
 */
export const notifyOnboardingPassed = async ({ clientName, amPmName, teamName }) => {
   const ids = await getIdsForRolesOrNames({ 
      roles: ['ceo', 'manager'],
      names: [amPmName].filter(Boolean),
      team: teamName
   });
   const uniqueIds = [...new Set(ids)];
   await notifyUsers(uniqueIds, {
      title: 'Onboarding Approved',
      message: `QA passed the onboarding for ${clientName}. Project is now active.`,
      type: 'success'
   });
};

/**
 * Trigger Event: Onboarding Failed (AM/PM)
 */
export const notifyOnboardingFailed = async ({ clientName, amPmName }) => {
   const ids = await getIdsForRolesOrNames({ 
      names: [amPmName].filter(Boolean)
   });
   await notifyUsers([...new Set(ids)], {
      title: 'Onboarding Audit Failed',
      message: `QA rejected the onboarding for ${clientName}. Please review the notes.`,
      type: 'error'
   });
};

/**
 * Trigger Event: Reactivation Requested
 */
export const notifyReactivation = async (clientName, closerName) => {
   const ids = await getIdsForRolesOrNames({ roles: ['qa', 'ceo', 'manager'] }); // Generic managers get it if unresolved team
   await notifyUsers(ids, {
      title: 'Reactivation Request',
      message: `${closerName} initiated a reactivation for ${clientName}.`,
      type: 'info'
   });
};
