// Temporary customer workspace policy. Store identity is always resolved on the server.
export const ANALYTICS_ONLY_MESSAGE = 'החשבון פתוח כרגע לצפייה באנליטיקות בלבד. שאר הכלים יהיו זמינים בהמשך.';

export function customerDashboardAccess(dbName) {
  return dbName === 'steimatzky'
    ? { mode: 'analytics-only', panels: ['analytics'], experiment: 'semantix_takeover' }
    : { mode: 'standard' };
}

export function customerDashboardOperationAllowed(dbName, method, path) {
  if (customerDashboardAccess(dbName).mode !== 'analytics-only') return true;
  return method === 'GET' && ['dashboard', 'dashboard/ab-test'].includes(path);
}

export function assertCustomerWorkspaceWritable(dbName) {
  if (typeof dbName !== 'string' || !dbName.trim()) throw Object.assign(new Error('שם חנות לא תקין'), { status: 400 });
  if (customerDashboardAccess(dbName).mode === 'analytics-only') {
    throw Object.assign(new Error(ANALYTICS_ONLY_MESSAGE), { status: 423 });
  }
}
