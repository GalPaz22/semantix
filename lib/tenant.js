import clientPromise from "/lib/mongodb";
import { getUserBySession } from "/lib/getUserBySession";
import { isAdminEmail } from "/lib/admin";

export function isAdminSession(session) {
  return isAdminEmail(session?.user?.email);
}

const deny = (status, error) => ({ error: Response.json({ error }, { status }) });

/**
 * Decide which tenant database a request may read or write.
 *
 * The admin may target any dbName (it is required). Every other user is pinned
 * to the dbName on their own users.users document: a requested dbName that
 * differs is refused, and an omitted one resolves to their own.
 *
 * @param {object|null} session   - result of getServerSession(authOptions)
 * @param {string} [requestedDbName]
 * @returns {Promise<{dbName: string, isAdmin: boolean, user: object|null} | {error: Response}>}
 */
export async function authorizeTenantDb(session, requestedDbName) {
  if (!session?.user) return deny(401, "Unauthorized");

  if (isAdminSession(session)) {
    if (!requestedDbName) return deny(400, "Missing dbName");
    return { dbName: requestedDbName, isAdmin: true, user: null };
  }

  const client = await clientPromise;
  const user = await getUserBySession(client.db("users"), session.user, {
    dbName: 1,
    apiKey: 1,
    credentials: 1,
  });
  const owned = [user?.credentials?.dbName, user?.dbName].filter(Boolean);
  if (!owned.length) return deny(404, "No store is connected to this account");
  if (requestedDbName && !owned.includes(requestedDbName)) return deny(403, "Forbidden");
  return { dbName: requestedDbName || owned[0], isAdmin: false, user };
}

/**
 * The store's search API key (the optimizer keys tenants by it). For the
 * admin, `tenant.user` is null, so look the store up by its dbName.
 */
export async function tenantApiKey(tenant) {
  const own = tenant.user?.apiKey || tenant.user?.credentials?.apiKey;
  if (own) return own;
  const client = await clientPromise;
  const doc = await client.db("users").collection("users").findOne(
    { $or: [{ "credentials.dbName": tenant.dbName }, { dbName: tenant.dbName }], apiKey: { $exists: true, $ne: "" } },
    { projection: { apiKey: 1 } }
  );
  return doc?.apiKey || null;
}
