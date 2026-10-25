export function optimizerRouteAllowed(method, path) {
  const id = '[a-fA-F0-9]{24}';
  const routes = {
    GET: ['dashboard', 'dashboard/catalog', 'dashboard/products', 'dashboard/merchandising', 'concierge/settings', 'concierge/conversations', 'concierge/conversations/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}', 'optimization', 'optimization/weekly-review', 'optimization/weekly-review/queries', 'optimization/plans', 'conversion', 'proposals', 'experiments', 'rules', `proposals/${id}/monitor`, 'agent/runs', `agent/runs/${id}`, `agent/runs/${id}/stream`, `experiments/${id}/metrics`],
    POST: ['dashboard/search', 'optimization/report', 'optimization/weekly-review', 'optimization/actions', `optimization/actions/${id}/(execute|verify|dismiss)`, 'agent/run', `agent/runs/${id}/stop`, `proposals/${id}/(approve|reject)`, `proposals/${id}/weekly/(approve|test|reject|stop|promote)`, `experiments/${id}/(start|pause|resume|kill|complete|promote)`, `experiments/${id}/metrics/refresh`, 'rules/parse', 'rules', `rules/${id}/(enable|disable)`],
    PUT: ['dashboard/search-layout', 'dashboard/pins', 'dashboard/merchandising', 'dashboard/products/visibility', 'dashboard/products/boost', 'concierge/settings', 'optimization/policy'],
    DELETE: [`rules/${id}`],
  };
  if (method === 'GET' && path === 'dashboard/campaigns') return true;
  return (routes[method] || []).some(pattern => new RegExp(`^${pattern}$`).test(path));
}

export function ownershipFilter(dbName, apiKeys) {
  return { $or: [{ dbName }, { 'draftExperiment.dbName': dbName }, { 'draftRule.dbName': dbName }, { tenantApiKey: { $in: apiKeys } }] };
}

export function publicOptimizerData(value) {
  if (Array.isArray(value)) return value.map(publicOptimizerData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['tenantApiKey', 'apiKey', 'fingerprints', 'costUsd', 'costEstimated', 'budgetExhausted', 'spentUsd', 'budgetUsd', 'remainingUsd'].includes(key))
    .map(([key, item]) => [key, publicOptimizerData(item)]));
}
