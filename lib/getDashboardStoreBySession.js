import { getUserBySession } from './getUserBySession.js';

/** Resolve the store assignment from the user's current database record. */
export async function getDashboardStoreBySession(db, sessionUser) {
  const user = await getUserBySession(db, sessionUser);
  const dbName = user?.dbName || user?.credentials?.dbName;
  if (typeof dbName !== 'string' || !dbName.trim()) return null;

  // API keys belong to search integrations, not dashboard access. Never derive
  // the store from session claims or browser-supplied customer parameters.
  return { dbName };
}
