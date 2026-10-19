export function usesLocalOptimizer(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && url.port === '4400' && !url.username && !url.password;
  } catch { return false; }
}

export async function waitForOptimizer(serviceUrl, { timeoutMs = 90000, intervalMs = 1000, fetchHealth = fetch } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetchHealth(new URL('/api/health', serviceUrl), { signal: AbortSignal.timeout(Math.min(3000, Math.max(1, deadline - Date.now()))) });
      if (response.ok) {
        const data = await response.json();
        if (data.ok === true && data.services?.mongodb?.connected === true) return;
      }
    } catch { /* The service may still be connecting to its database. */ }
    const remaining = deadline - Date.now();
    if (remaining > 0) await new Promise(done => setTimeout(done, Math.min(intervalMs, remaining)));
  }
  throw new Error('Local optimizer did not become ready. Check the optimizer.log in the semantix-local temporary directory.');
}
