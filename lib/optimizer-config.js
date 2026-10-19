export function optimizerServiceConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const endpoint = env.OPTIMIZER_SERVICE_URL || (production ? '' : 'http://127.0.0.1:4400');
  let url;
  try { url = new URL(endpoint); } catch { throw Object.assign(new Error('שירות הדאשבורד טרם הוגדר בשרת. יש להשלים את חיבור הפרודקשן.'), { status: 503 }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !env.OPTIMIZER_OPS_PASSWORD))) {
    throw Object.assign(new Error('הגדרת שירות הדאשבורד בשרת אינה מוכנה לפרודקשן.'), { status: 503 });
  }
  return { endpoint: url.origin, password: env.OPTIMIZER_OPS_PASSWORD };
}
