import { getDashboardStoreBySession } from './getDashboardStoreBySession.js';
import { assertCustomerWorkspaceWritable } from './customer-dashboard-access.js';

export async function assertCustomerWriteAccess(client, sessionUser, targetDbName) {
  if (targetDbName) assertCustomerWorkspaceWritable(targetDbName);
  const store = await getDashboardStoreBySession(client.db('users'), sessionUser);
  if (store) assertCustomerWorkspaceWritable(store.dbName);
}
