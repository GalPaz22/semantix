import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';

// Server-only deployment configuration, never returned through dashboard APIs.
// Credentials belong in the environment or this private control-plane record.
export const SEARCH_RULE_CONNECTION = 'saved-search-rules';

export async function publishSearchRulesToRedis(client, dbName, {
  env = process.env, connect = options => createClient(options), timeoutMs = 6000,
} = {}) {
  let redis, timer, cancelled = false;
  const lock = `rules:publication-lock:${dbName}`, lockValue = randomUUID();
  async function publish() {
    const searchOrigin = new URL(env.SEARCH_SERVICE_URL || 'https://api.semantix-ai.com').origin;
    const config = env.SEARCH_RULES_REDIS_URL ? null : await client.db('control_plane')
      .collection('service_connections').findOne({ _id: SEARCH_RULE_CONNECTION, enabled: true, searchOrigin }, {
        projection: { redisUrl: 1 }, maxTimeMS: 2000,
      });
    const redisUrl = env.SEARCH_RULES_REDIS_URL || config?.redisUrl;
    if (!redisUrl || cancelled) return false;
    if (!['redis:', 'rediss:'].includes(new URL(redisUrl).protocol)) return false;
    redis = connect({ url: redisUrl, disableOfflineQueue: true,
      socket: { connectTimeout: 2000, reconnectStrategy: false } });
    // Never log connection errors, which may contain service credentials.
    redis.on('error', () => {});
    await redis.connect();
    if (cancelled) { await redis.disconnect().catch(() => {}); return false; }
    let acquired = false;
    try {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        acquired = await redis.set(lock, lockValue, { NX: true, PX: 15000 });
        if (acquired) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!acquired || cancelled) return false;
      // Read after locking: simultaneous saves cannot publish an older snapshot
      // over a newer one. Identity comes only from the authenticated store.
      const accounts = await client.db('users').collection('users').find({ dbName }, {
        projection: { apiKey: 1, 'credentials.dbName': 1 }, maxTimeMS: 2000,
      }).toArray();
      const keys = [...new Set(accounts.filter(row => !row.credentials?.dbName || row.credentials.dbName === dbName)
        .map(row => row.apiKey).filter(key => typeof key === 'string' && key))];
      if (!keys.length || cancelled) return false;
      const rules = await client.db('control_plane').collection('rules').find({ status: 'active', $or: [
        { dbName }, { dbName: { $exists: false }, tenantApiKey: { $in: keys } },
      ] }, { projection: { condition: 1, patch: 1, merchantQuery: 1 }, maxTimeMS: 2000 })
        .sort({ updatedAt: 1, createdAt: 1, _id: 1 }).limit(501).toArray();
      if (rules.length > 500 || cancelled) return false;
      rules.sort((a, b) => Number(typeof a.merchantQuery === 'string') - Number(typeof b.merchantQuery === 'string'));
      const payload = JSON.stringify(rules.map(rule => ({ id: String(rule._id), condition: rule.condition, patch: rule.patch })));
      const transaction = redis.multi();
      for (const key of keys) {
        // Persist until the next edit/removal; a missing Studio cron must not
        // silently revert the customer's arrangement after two minutes.
        transaction.set(`rules:active:${key}`, payload);
        transaction.del(`store-config:${key}`);
      }
      transaction.del(`store-config-db:${dbName}`);
      await transaction.exec();
      return true;
    } finally {
      if (acquired && redis.isOpen) await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", {
        keys: [lock], arguments: [lockValue],
      }).catch(() => {});
    }
  }
  try {
    return await Promise.race([publish(), new Promise((_, reject) => {
      timer = setTimeout(() => { cancelled = true; reject(Error('Publication timed out')); }, timeoutMs);
    })]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    if (redis?.isOpen) await redis.disconnect().catch(() => {});
  }
}
