const ARMS = ['semantix', 'native'];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const browser = row => text(row.session_id || row.sessionId);
const arm = row => row.ab_tests?.semantix_takeover;
const time = row => +new Date(row.created_at || row.received_at || row.timestamp);
const key = row => JSON.stringify([browser(row), text(row.search_id)]);
const fraction = (value, total) => total ? value / total : null;

// Order-page observations, not a paid-order ledger. Only explicit search and
// visit IDs can link an order; browser identity or query text alone cannot.
export function summarizeTakeoverOrders({ orders, searches, chains, stable, assignedVisitors, resolveProduct, productGroups }, { start, end, available, complete }) {
  const make = () => ({ measuredVisitors: 0, orderingVisitors: 0, visitorOrderRate: null, reportedOrders: 0, searchLinkedOrders: 0, productLinkedOrders: 0, purchasedProducts: 0, productPurchaseRate: null, searchLinkCoverage: null });
  const groups = Object.fromEntries(ARMS.map(name => [name, make()]));
  const orderingVisitors = Object.fromEntries(ARMS.map(name => [name, new Set()]));
  const excluded = {}, unique = new Map(), purchased = new Set();
  let completedEvents = 0, duplicateEvents = 0, uniqueCompletedOrders = 0;
  const exclude = reason => { excluded[reason] = (excluded[reason] || 0) + 1; };
  for (const row of orders) {
    if (row.event_type !== 'checkout_completed' || row.source !== 'order-page') { exclude('unsupportedEvent'); continue; }
    const at = time(row);
    if (!Number.isFinite(at) || at < start || at >= end) { exclude('outsidePeriod'); continue; }
    completedEvents++;
    const orderId = text(row.order_id);
    if (!orderId) { exclude('missingOrderId'); continue; }
    if (!unique.has(orderId)) unique.set(orderId, []);
    unique.get(orderId).push(row);
  }
  for (const rows of unique.values()) {
    duplicateEvents += rows.length - 1;
    // Conflicting retries cannot credit one order to two arms or browsers.
    const signatures = new Set(rows.map(row => JSON.stringify([browser(row), arm(row), text(row.search_id), text(row.visit_id),
      [...new Set((Array.isArray(row.items) ? row.items : []).map(item => text(item?.id)).filter(Boolean))].sort()])));
    if (signatures.size !== 1) { exclude('conflictingDuplicate'); continue; }
    uniqueCompletedOrders++;
    const row = rows.reduce((first, value) => time(value) < time(first) ? value : first);
    const visitor = stable.get(browser(row)), at = time(row);
    if (!visitor || !ARMS.includes(arm(row)) || visitor.arm !== arm(row) || at < visitor.first || !assignedVisitors[visitor.arm].has(browser(row))) { exclude('unassignedOrConflictingArm'); continue; }
    const counts = groups[visitor.arm]; counts.reportedOrders++;
    orderingVisitors[visitor.arm].add(browser(row));
    if (!text(row.search_id)) { exclude('missingSearchId'); continue; }
    const search = searches.get(key(row));
    if (!search || search.ambiguous || search.arm !== visitor.arm || at < search.time) { exclude('noMatchingSearch'); continue; }
    if (!text(row.visit_id) || !text(search.row.visit_id) || row.visit_id !== search.row.visit_id) { exclude('noMatchingVisit'); continue; }
    counts.searchLinkedOrders++;
    let matchedProduct = false;
    for (const item of Array.isArray(row.items) ? row.items : []) {
      if (!text(item?.id)) continue;
      const product = resolveProduct({ product_id: item.id });
      if (!product) continue;
      const productKey = JSON.stringify([browser(row), text(row.search_id), product]);
      const chain = chains.get(productKey);
      if (!chain || chain.arm !== visitor.arm || chain.search.visit_id !== row.visit_id) continue;
      const beforeOrder = chain.clicks.some(click => click.visit_id === row.visit_id && +new Date(click.received_at || click.timestamp) <= at)
        || (chain.orderAdds || []).some(add => add.visit_id === row.visit_id && add.at <= at);
      if (!beforeOrder) continue;
      matchedProduct = true;
      if (!purchased.has(productKey)) { purchased.add(productKey); counts.purchasedProducts++; }
    }
    if (matchedProduct) counts.productLinkedOrders++;
    else exclude('noMatchingProductInteraction');
  }
  for (const name of ARMS) {
    const counts = groups[name];
    counts.measuredVisitors = assignedVisitors[name].size;
    counts.orderingVisitors = orderingVisitors[name].size;
    counts.visitorOrderRate = complete ? fraction(counts.orderingVisitors, counts.measuredVisitors) : null;
    counts.productPurchaseRate = complete ? fraction(counts.purchasedProducts, productGroups[name].clickedProducts) : null;
    counts.searchLinkCoverage = complete ? fraction(counts.searchLinkedOrders, counts.reportedOrders) : null;
    if (!complete) for (const field of ['reportedOrders', 'orderingVisitors', 'searchLinkedOrders', 'productLinkedOrders', 'purchasedProducts']) counts[field] = null;
  }
  return { available, complete, source: 'checkout_events:checkout_completed:order-page', basis: 'order-success-page', groups,
    coverage: { completedEvents, uniqueCompletedOrders, duplicateEvents, excluded },
    note: 'הזמנות שדווחו מעמוד ההצלחה. קישור דורש אותו מבקר, מזהה חיפוש וביקור; קישור מוצר דורש גם פריט הזמנה תואם ואינטראקציה קודמת בחיפוש. לא נכללים אימות תשלום, ביטולים או החזרים.' };
}
