const pending = { published: false, message: 'השינויים נשמרו. ההפעלה האוטומטית בחיפוש טרם אושרה; אין צורך לשמור מחדש.' };

// Called only after saving. Identity and the private search key come from the
// authenticated store's account; browser-supplied keys and patches are ignored.
export async function publishSavedSearchRules(client, dbName, { request = fetch, env = process.env } = {}) {
  try {
    const accounts = await client.db('users').collection('users').find({ dbName }, {
      projection: { apiKey: 1, platform: 1, 'credentials.dbName': 1 },
    }).sort({ _id: 1 }).toArray();
    const own = accounts.filter(row => row.apiKey && (!row.credentials?.dbName || row.credentials.dbName === dbName));
    const account = own.find(row => row.platform) || own[0];
    if (!account) return { ...pending };
    const url = new URL('/rules/publication', env.SEARCH_SERVICE_URL || 'https://api.semantix-ai.com');
    if (url.username || url.password || !['https:', 'http:'].includes(url.protocol) || (env.NODE_ENV === 'production' && url.protocol !== 'https:')) return { ...pending };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await request(url, { method: 'POST', headers: { 'x-api-key': account.apiKey, accept: 'application/json' },
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(4000) });
        if (!response.ok) { if (response.status >= 500 && attempt === 0) continue; return { ...pending }; }
        const result = await response.json();
        if (result.available !== true || result.published !== true || result.dbName !== dbName || result.mode !== 'search-mongo' || !/^[a-f\d]{64}$/.test(result.revision) || result.propagationSeconds !== 15) return { ...pending };
        return { published: true, message: 'השינויים נשמרו והופעלו אוטומטית. הם יופיעו בחיפוש חדש בתוך עד 15 שניות.' };
      } catch { /* A committed save is retained; the engine also refreshes from Mongo. */ }
    }
  } catch { /* Do not turn a publication failure into a failed save. */ }
  return { ...pending };
}

export async function saveSharedPinnedResults(client, dbName, pinnedResults) {
  if (!dbName) throw new Error('לא נמצאה חנות מחוברת לחשבון');
  const result = await client.db('users').collection('users').updateMany({ dbName,
    $or: [{ 'credentials.dbName': dbName }, { 'credentials.dbName': { $exists: false } }],
  }, { $set: { 'credentials.pinnedResults': pinnedResults, updatedAt: new Date() } });
  if (!result.matchedCount) throw new Error('החנות לא נמצאה');
  return publishSavedSearchRules(client, dbName);
}
