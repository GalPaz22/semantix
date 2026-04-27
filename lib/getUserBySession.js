import { ObjectId } from "mongodb";

/**
 * Find a user document in users.users by session.
 * Handles both Google OAuth users (looked up by email) and
 * credentials users (no real email — looked up by _id or username).
 *
 * @param {import('mongodb').Db} db  - The "users" MongoDB database
 * @param {object} sessionUser       - session.user from getServerSession()
 * @param {object} [projection]      - Optional MongoDB projection
 * @returns {Promise<object|null>}
 */
export async function getUserBySession(db, sessionUser, projection = {}) {
  const col = db.collection("users");
  const { email, id } = sessionUser || {};

  // 1. Try email (Google users and regular users with real emails)
  if (email && !email.endsWith("@internal.semantix")) {
    const user = await col.findOne({ email }, projection ? { projection } : {});
    if (user) return user;
  }

  // 2. Try MongoDB _id (credentials users — id is the _id string)
  if (id) {
    try {
      const user = await col.findOne({ _id: new ObjectId(id) }, projection ? { projection } : {});
      if (user) return user;
    } catch {
      // id is not a valid ObjectId — continue
    }
  }

  // 3. Try username extracted from synthetic email
  if (email?.endsWith("@internal.semantix")) {
    const username = email.split("@")[0];
    const user = await col.findOne({ username }, projection ? { projection } : {});
    if (user) return user;
  }

  return null;
}
