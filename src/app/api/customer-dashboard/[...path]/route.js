import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '/lib/mongodb';
import { getUserBySession } from '/lib/getUserBySession';
import { optimizerRouteAllowed, ownershipFilter, publicOptimizerData } from '/lib/optimizer-access';
import { getDashboardMerchandising, saveDashboardMerchandising } from '/lib/dashboard-merchandising';
import { optimizerServiceConfig } from '/lib/optimizer-config';
import { readStudioJson } from '/lib/studio-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const fail = (error, status) => NextResponse.json({ error }, { status });
const ADMIN_EMAIL = 'galpaz2210@gmail.com';

async function handle(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail('יש להתחבר כדי לפתוח את הדאשבורד', 401);
  const path = (params.path || []).join('/');
  const method = request.method;
  const isAdmin = session.user.email?.toLowerCase() === ADMIN_EMAIL;
  const incoming = new URL(request.url);
  if (method !== 'GET' && request.headers.get('origin') && request.headers.get('origin') !== incoming.origin) return fail('Forbidden origin', 403);
  if (!(path === 'stores' && method === 'GET') && !optimizerRouteAllowed(method, path)) return fail('Unsupported optimizer operation', 404);
  try {
    const client = await clientPromise;
    const users = client.db('users').collection('users');
    if (path === 'stores') {
      if (!isAdmin) return fail('Admin only', 403);
      const rows = await users.find({ dbName: { $type: 'string', $ne: '' }, apiKey: { $type: 'string', $ne: '' } })
        .project({ dbName: 1, name: 1, platform: 1, wooSiteUrl: 1, shopifyDomain: 1 }).toArray();
      const stores = new Map();
      for (const row of rows) if (!stores.has(row.dbName) || row.platform) stores.set(row.dbName, { dbName: row.dbName, name: row.wooSiteUrl || row.shopifyDomain || row.dbName });
      return NextResponse.json([...stores.values()].sort((a, b) => a.dbName.localeCompare(b.dbName)));
    }
    const selectedStore = incoming.searchParams.get('store');
    const user = isAdmin && selectedStore
      ? await users.findOne({ dbName: selectedStore, apiKey: { $type: 'string', $ne: '' } }, { sort: { platform: -1 } })
      : await getUserBySession(client.db('users'), session.user);
    if (!user?.apiKey || !user.dbName) return fail(isAdmin ? 'יש לבחור חנות לצפייה' : 'לא נמצאה חנות מחוברת לחשבון', 409);
    const siblings = await users.find({ dbName: user.dbName }).project({ apiKey: 1 }).toArray();
    const keys = siblings.map(u => u.apiKey).filter(Boolean);
    if (path === 'dashboard/merchandising') {
      if (method === 'GET') return NextResponse.json(await getDashboardMerchandising(client, user.dbName));
      const data = await saveDashboardMerchandising(client, { dbName: user.dbName, actor: session.user.email || session.user.id, body: await request.json() });
      let published = false;
      try {
        const config = optimizerServiceConfig();
        const publication = new URL(`${config.prefix}/dashboard/merchandising/publish`, config.endpoint);
        publication.searchParams.set('tenant', user.apiKey);
        const response = await fetch(publication, { method: 'POST', headers: config.headers, signal: AbortSignal.timeout(15000), cache: 'no-store' });
        if (response.ok) published = (await readStudioJson(response)).published === true;
      } catch { /* The transaction committed; publishing is reported separately. */ }
      return NextResponse.json({ ...data, saved: true, published, message: published ? 'הכללים נשמרו. השינויים בכללים מהאדמין יופיעו בחיפוש תוך עד 5 דקות.' : 'הכללים נשמרו. הסנכרון עם מנוע החיפוש טרם אומת; יש לרענן ולבדוק.' });
    }
    const parts = path.split('/');
    // Concierge records live in the authenticated store DB, and are checked there.
    const resourceId = parts[0] === 'concierge' ? null : parts.find(part => /^[a-f\d]{24}$/i.test(part));
    if (resourceId) {
      const collection = parts[0] === 'optimization' ? 'optimization_actions' : parts[0] === 'agent' ? 'agent_runs' : parts[0];
      const owned = await client.db('control_plane').collection(collection).findOne({ _id: new ObjectId(resourceId), ...ownershipFilter(user.dbName, keys) }, { projection: { _id: 1 } });
      if (!owned) return fail('הפריט לא נמצא בחנות שלך', 404);
    }
    const config = optimizerServiceConfig();
    const url = new URL(`${config.prefix}/${path}`, config.endpoint);
    // Never accept a browser-supplied tenant, API key or database name.
    url.searchParams.set('tenant', user.apiKey);
    for (const key of ['days', 'status']) if (incoming.searchParams.has(key)) url.searchParams.set(key, incoming.searchParams.get(key));
    if (path === 'optimization/weekly-review/queries') for (const key of ['query','page']) if (incoming.searchParams.has(key)) url.searchParams.set(key,incoming.searchParams.get(key));
    if (path === 'dashboard/catalog') url.searchParams.set('query', incoming.searchParams.get('query') || '');
    if (path === 'dashboard/products') {
      for (const key of ['query', 'visibility', 'promotion', 'page']) if (incoming.searchParams.has(key)) url.searchParams.set(key, incoming.searchParams.get(key));
    }
    if (path === 'concierge/conversations') {
      for (const key of ['query', 'page', 'content']) if (incoming.searchParams.has(key)) url.searchParams.set(key, incoming.searchParams.get(key));
    }
    let body;
    if (method !== 'GET' && method !== 'DELETE') {
      const raw = await request.text();
      body = raw ? JSON.parse(raw) : {};
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid body', 400);
      delete body.tenant; delete body.tenantApiKey; delete body.apiKey; delete body.dbName;
      if (path === 'rules' || path === 'rules/parse') {
        body.tenantApiKey = user.apiKey;
        if (path === 'rules') body.dbName = user.dbName;
      }
      body.by = session.user.email || session.user.id;
      // Strict optimizer schemas reject extra fields.
      if (path === 'optimization/actions' || path === 'optimization/policy' || path === 'agent/run' || path === 'dashboard/pins' || path === 'dashboard/search' || path === 'dashboard/products/visibility' || path === 'dashboard/products/boost') delete body.by;
    }
    const headers = { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) };
    Object.assign(headers, config.headers);
    if (/^agent\/runs\/[a-f\d]{24}\/stream$/i.test(path)) {
      const upstream = await fetch(url, { headers, cache: 'no-store', redirect: 'error', signal: request.signal });
      if (!upstream.ok || !upstream.body) return fail('הזרמת התשובה לא זמינה', upstream.status === 404 ? 404 : 502);
      return new Response(upstream.body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
    }
    const response = await fetch(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(120000) });
    const data = await readStudioJson(response);
    return NextResponse.json(publicOptimizerData(data), { status: response.status });
  } catch (error) {
    if (error.status) return fail(error.message, error.status);
    if (path === 'dashboard/merchandising' && error.code === 11000) return fail('ביטוי החיפוש כבר נשמר בכלל אחר. יש לרענן ולבדוק את הכללים.', 409);
    if (path === 'dashboard/merchandising' && !error.code && !(error instanceof SyntaxError)) return fail(error.message || 'לא ניתן לשמור את הכללים', 400);
    if (error instanceof SyntaxError) return fail('Invalid JSON', 400);
    console.error('[optimizer proxy]', error.message);
    return fail('לא ניתן לקבל תשובה מהסטודיו. נסו שוב.', 502);
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
