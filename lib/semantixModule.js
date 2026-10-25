export function defaultSemantixModule(dbName = '') {
  const slug = String(dbName || '').trim();
  return {
    module: slug ? `${slug}-semantix` : '',
    enabled: false,
    percent: 100
  };
}

export function normalizeSemantixModule(config = {}, dbName = '') {
  const fallback = defaultSemantixModule(dbName);
  const parsedPercent = Number(config?.percent);
  return {
    module: String(config?.module || fallback.module || '').trim(),
    enabled: config?.enabled === true,
    percent: Number.isFinite(parsedPercent)
      ? Math.min(100, Math.max(0, Math.round(parsedPercent)))
      : 100
  };
}
