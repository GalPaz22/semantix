const numeric = v => typeof v !== 'number' && typeof v !== 'string' || typeof v === 'string' && !v.trim() ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const cents = v => { const n = numeric(v), c = n === null || n < 0 ? null : Math.round(n * 100); return Number.isSafeInteger(c) ? c : null; };
const round = n => Math.round(n * 100) / 100;

// One allocation for every order line, so searches/lanes cannot each claim a full basket.
// A total below the item subtotal is allocated proportionally, with penny conservation.
// The tracker has no separate shipping/discount fields: this is reported item value,
// capped by the order total, not verified net receipts or exact discount accounting.
export function allocateMerchandiseCents(order) {
  if (!/^[A-Z]{3}$/.test(order.currency || '') || !Array.isArray(order.items) || !order.items.length) return null;
  const total = cents(order.total_price);
  const lines = order.items.map(i => { const unit = cents(i.price), quantity = numeric(i.quantity), value = unit === null || !Number.isSafeInteger(quantity) || quantity <= 0 ? null : unit * quantity; return Number.isSafeInteger(value) ? value : null; });
  if (total === null || lines.some(v => v === null)) return null;
  const subtotal = lines.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(subtotal)) return null;
  if (!subtotal) return lines.map(() => 0);
  const cap = Math.min(total, subtotal), denominator = BigInt(subtotal);
  const shares = lines.map((value, index) => { const numerator = BigInt(value) * BigInt(cap); return { index, cents: Number(numerator / denominator), remainder: numerator % denominator }; });
  let remaining = cap - shares.reduce((n, s) => n + s.cents, 0);
  for (const share of [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) { if (!remaining) break; share.cents++; remaining--; }
  return shares.map(s => s.cents);
}

export function compareProductMoney(groups, currencies, complete) {
  const rows = [...new Set(currencies)].sort().map(currency => {
    const side = key => { const a = groups[key], row = a.value?.find(v => v.currency === currency), amount = a.value === null ? null : row?.amount || 0;
      return { amount, searches: a.searches, per100Searches: amount !== null && a.searches ? round(amount / a.searches * 100) : null }; };
    const semantix = side('semantix'), native = side('native');
    const available = complete && semantix.amount !== null && native.amount !== null && semantix.searches > 0 && native.searches > 0;
    const baseline = available ? native.amount / native.searches * semantix.searches : null;
    return { currency, complete: available, semantix, native,
      rawDifference: available ? round(semantix.amount - native.amount) : null,
      expectedNativeAtSemantixVolume: baseline === null ? null : round(baseline),
      normalizedDifference: available ? round(semantix.amount - baseline) : null,
      relativeLift: available && native.amount > 0 ? (semantix.amount / semantix.searches) / (native.amount / native.searches) - 1 : null };
  });
  return { version: 'reported-merchandise-per-search-v1', rows, complete: rows.length > 0 && rows.every(r => r.complete), incrementalRevenueStatus: 'not-established',
    method: 'Reported matched item prices × quantity, proportionally capped at the reported order total. Separate shipping, tax and discount amounts are unavailable; this is not verified net receipts. No extra credit for shipping or unrelated items, currency conversion or monthly extrapolation. Normalized difference = Semantix value minus native value per search × Semantix searches. Descriptive comparison, not proven incremental revenue or net profit.' };
}
