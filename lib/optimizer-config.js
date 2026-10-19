export function optimizerServiceConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const endpoint = env.STUDIO_SERVICE_URL || (production ? 'https://tenant-studio.onrender.com' : 'http://127.0.0.1:4320');
  let url;
  try { url = new URL(endpoint); } catch { throw Object.assign(new Error('כתובת הסטודיו בשרת אינה תקינה'), { status: 503 }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw Object.assign(new Error('כתובת הסטודיו בשרת אינה תקינה לפרודקשן'), { status: 503 });
  }
  if (!env.STUDIO_CUSTOMER_API_TOKEN?.trim()) throw Object.assign(new Error('יש להשלים את החיבור המאובטח של הדאשבורד לסטודיו'), { status: 503 });
  return { endpoint: url.origin, prefix: '/api/customer-dashboard', headers: { 'X-Studio-Customer-Token': env.STUDIO_CUSTOMER_API_TOKEN } };
}
