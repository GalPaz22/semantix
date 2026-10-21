import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { merchandisingTerm, normalizeMerchandisingRules } from './merchandising-config.js';

const error = (message, status = 400) => Object.assign(new Error(message), { status });
const imageOf = product => {
  const image = product.image || product.images?.[0];
  return typeof image === 'string' ? image : image?.src || image?.url || '';
};
async function currentState(client, dbName, session) {
  const options = session ? { session } : {};
  const accounts = await client.db('users').collection('users').find({ dbName }, { ...options, projection: { _id: 1, platform: 1, 'credentials.dbName': 1, 'credentials.pinnedResults': 1 } }).sort({ _id: 1 }).toArray();
  // Older shared accounts can contain another store's platform credentials.
  // Never replace that store's merchandising when synchronizing account keys.
  const users = accounts.filter(user => !user.credentials?.dbName || user.credentials.dbName === dbName);
  const rules = await client.db('control_plane').collection('rules').find({ dbName, merchantQuery: { $type: 'string' } }, { ...options, projection: { merchantQuery: 1, patch: 1, status: 1, updatedAt: 1 } }).sort({ _id: 1 }).toArray();
  if (!users.length) throw error('החנות לא נמצאה', 404);
  const primary = users.find(user => user.platform) || users[0];
  const pinnedResults = Array.isArray(primary.credentials?.pinnedResults) ? primary.credentials.pinnedResults : [];
  const revision = createHash('sha256').update(JSON.stringify({ users, rules })).digest('hex');
  return { users, rules, pinnedResults, revision };
}
async function hydrate(client, dbName, rules, session) {
  const ids = [...new Set(rules.flatMap(rule => rule.productIds).map(String))];
  const options = { ...(session ? { session } : {}), projection: { _id: 1, id: 1, name: 1, image: 1, images: 1, price: 1, hidden: 1 } };
  const rows = ids.length ? await client.db(dbName).collection('products').find({ $or: [
    { _id: { $in: ids.filter(id => /^[a-f\d]{24}$/i.test(id)).map(id => new ObjectId(id)) } },
    { id: { $in: ids.flatMap(id => Number.isFinite(Number(id)) ? [id, Number(id)] : [id]) } },
  ] }, options).toArray() : [];
  const byId = new Map();
  for (const row of rows) { byId.set(String(row._id), row); if (row.id != null) byId.set(String(row.id), row); }
  return rules.map(rule => {
    const products = rule.productIds.map(id => {
      const row = byId.get(String(id));
      return row ? { _id: String(row._id), name: row.name || 'מוצר ללא שם', image: imageOf(row), price: row.price ?? '', hidden: row.hidden === true }
        : { _id: String(id), name: 'מוצר שאינו זמין בקטלוג', image: '', price: '', unavailable: true };
    });
    return { ...rule, productIds: products.map(product => product._id), products };
  });
}
export async function getDashboardMerchandising(client, dbName) {
  const state = await currentState(client, dbName);
  const rules = [
    ...state.pinnedResults.map(rule => ({ query: rule.query || '', productIds: rule.productIds || [], enabled: rule.enabled !== false })),
    ...state.rules.map(rule => ({ ruleId: String(rule._id), matchType: 'exact', query: rule.merchantQuery, productIds: rule.patch?.pinnedResults?.[0]?.productIds || [], ...(rule.patch?.excludedProductIds?.length ? {excludedProductIds:rule.patch.excludedProductIds} : {}), enabled: rule.status === 'active' })),
  ];
  return { pinnedResults: await hydrate(client, dbName, rules), revision: state.revision };
}
export async function saveDashboardMerchandising(client, { dbName, actor, body }) {
  const cleaned = normalizeMerchandisingRules(body?.pinnedResults);
  if (typeof body.revision !== 'string' || !/^[a-f\d]{64}$/.test(body.revision)) throw error('יש לרענן את הכללים לפני שמירה', 409);
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const state = await currentState(client, dbName, session);
      if (state.revision !== body.revision) throw error('הכללים עודכנו מאז פתיחת המסך. רענן לפני שמירה כדי לשמור על השינוי האחר.', 409);
      const owned = new Set(state.rules.map(rule => String(rule._id)));
      if (cleaned.some(rule => rule.ruleId && !owned.has(rule.ruleId))) throw error('הכלל לא נמצא בחנות שלך', 404);
      const excludedIds = [...new Set(cleaned.flatMap(rule=>rule.excludedProductIds || []))];
      if (excludedIds.length) { const own = await client.db(dbName).collection('products').find({_id:{$in:excludedIds.map(id=>new ObjectId(id))}},{session,projection:{_id:1}}).toArray(); if(own.length!==excludedIds.length)throw error('מוצר שהוסתר אינו שייך לחנות או אינו זמין'); }
      const resolved = await hydrate(client, dbName, cleaned, session);
      if (resolved.some(rule => rule.products.some(product => product.unavailable || (rule.enabled && product.hidden)))) throw error('יש להסיר מוצרים שאינם בקטלוג או מוסתרים מכללים פעילים לפני שמירה');
      const canonical = resolved.filter(rule => !rule.ruleId).map(({ query, productIds, products, enabled }) => ({ query, productIds, products, enabled }));
      const updatedAt = new Date();
      await client.db('users').collection('users').updateMany({ dbName, _id: { $in: state.users.map(user => user._id) } }, { $set: { 'credentials.pinnedResults': canonical, updatedAt } }, { session });
      const collection = client.db('control_plane').collection('rules');
      if (state.rules.length) await collection.updateMany({ _id: { $in: state.rules.map(rule => rule._id) }, dbName }, { $unset: { merchantQuery: '' } }, { session });
      for (const rule of resolved.filter(rule => rule.ruleId)) {
        const query = merchandisingTerm(rule.query);
        await collection.updateOne({ _id: new ObjectId(rule.ruleId), dbName }, { $set: {
          merchantQuery: query, name: `נעיצות: ${query}`, condition: { mode: 'queryMatch', patterns: [query], matchType: 'exact' },
          patch: { pinnedResults: rule.productIds.length ? [{ query, productIds: rule.productIds, enabled: true }] : [], ...(rule.excludedProductIds?.length ? {excludedProductIds:rule.excludedProductIds} : {}) },
          status: rule.enabled && (rule.productIds.length || rule.excludedProductIds?.length) ? 'active' : 'disabled', updatedAt,
        } }, { session });
      }
      const retained = new Set(cleaned.map(rule => rule.ruleId).filter(Boolean));
      const removed = state.rules.filter(rule => !retained.has(String(rule._id))).map(rule => rule._id);
      if (removed.length) await collection.deleteMany({ _id: { $in: removed }, dbName }, { session });
      await client.db('control_plane').collection('catalog_change_audits').insertOne({ dbName, kind: 'manualSearchArrangement', appliedBy: actor, appliedAt: updatedAt,
        before: { pinnedResults: state.pinnedResults, rules: state.rules }, after: cleaned,
      }, { session });
    });
  } finally { await session.endSession(); }
  return getDashboardMerchandising(client, dbName);
}
