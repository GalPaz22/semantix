import { TAKEOVER_STORES } from './takeover-measurement.js';

// Temporary customer workspace policy. Store identity is always resolved on the server.
export const ANALYTICS_ONLY_MESSAGE = 'החשבון פתוח כרגע לצפייה באנליטיקות בלבד. שאר הכלים יהיו זמינים בהמשך.';
export const CHATBOT_LOCKED_MESSAGE = 'פאנל הצ׳אטבוט אינו זמין כרגע בחנות זו.';

export function customerDashboardAccess(dbName) {
  if (dbName === 'shipi') return { mode: 'standard', lockedPanels: ['agent'] };
  // Stores running a search experiment see its analytics only.
  return Object.hasOwn(TAKEOVER_STORES, dbName)
    ? { mode: 'analytics-only', panels: ['analytics'], experiment: 'semantix_takeover' }
    : { mode: 'standard' };
}

export function customerDashboardOperationAllowed(dbName, method, path) {
  const access = customerDashboardAccess(dbName);
  if (access.mode === 'analytics-only') return method === 'GET' && ['dashboard', 'dashboard/ab-test'].includes(path);
  return !(access.lockedPanels?.includes('agent') && ['agent', 'concierge'].includes(path.split('/')[0]));
}

export function assertCustomerWorkspaceWritable(dbName) {
  if (typeof dbName !== 'string' || !dbName.trim()) throw Object.assign(new Error('שם חנות לא תקין'), { status: 400 });
  if (customerDashboardAccess(dbName).mode === 'analytics-only') {
    throw Object.assign(new Error(ANALYTICS_ONLY_MESSAGE), { status: 423 });
  }
}
