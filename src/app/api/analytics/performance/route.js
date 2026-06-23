
import { getServerSession } from "next-auth";
import clientPromise from "../../../../../lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildDynamicDateFilter } from "../../../../../lib/analytics-helper";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { dbName, startDate, endDate } = await request.json();

        let effectiveEndDate = endDate;
        if (endDate) {
            const endObj = new Date(endDate);
            endObj.setHours(23, 59, 59, 999);
            effectiveEndDate = endObj.toISOString();
        }

        if (!dbName) {
            return Response.json({ error: "Missing dbName" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(dbName);

        // Dynamic Filter Construction
        let cartFilter = {};
        let checkoutFilter = {};
        let clicksDateFilter = {};

        if (startDate && endDate) {
            const cartDateFilter = await buildDynamicDateFilter(db, "cart", startDate, effectiveEndDate);
            const checkoutDateFilter = await buildDynamicDateFilter(db, "checkout_events", startDate, effectiveEndDate);
            const clicksFilter = await buildDynamicDateFilter(db, "product_clicks", startDate, effectiveEndDate);

            cartFilter = cartDateFilter;
            checkoutFilter = checkoutDateFilter;
            clicksDateFilter = clicksFilter;
        }

        // Parallel Fetch
        const [cart, checkout] = await Promise.all([
            db.collection("cart").find(cartFilter).sort({ timestamp: -1, created_at: -1 }).toArray().catch(e => []),
            db.collection("checkout_events").find(checkoutFilter).sort({ timestamp: -1, created_at: -1 }).toArray().catch(e => [])
        ]);

        // Inject/zero-results click → cart cross-reference (separated by source)
        // Matching strategy: session_id (when both sides have one) + product id/name
        //                    + timestamp proximity (click must precede cart add by ≤2 h)
        let zeroResultsCartCount = 0;
        let zeroResultsCartSessions = 0;
        let zeroResultsCartValue = 0;
        let zeroResultsItems = [];
        let zeroResultsCheckoutCount = 0;
        let zeroResultsCheckoutValue = 0;
        let zeroResultsCheckoutItems = [];
        let injectCartCount = 0;
        let injectCartSessions = 0;
        let injectCartValue = 0;
        let injectItems = [];
        let injectCheckoutCount = 0;
        let injectCheckoutValue = 0;
        let injectCheckoutItems = [];
        try {
            function toMs(val) {
                if (!val) return null;
                if (val instanceof Date) return val.getTime();
                const n = Number(val);
                if (!isNaN(n)) return n < 1e12 ? n * 1000 : n;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d.getTime();
            }

            function getItemTime(item) {
                return toMs(item.timestamp) ?? toMs(item.created_at) ?? toMs(item.createdAt) ?? toMs(item.time) ?? toMs(item.event_time) ?? null;
            }

            const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

            // Always apply a time filter on clicks even when no dashboard date range is set,
            // to avoid loading the entire historical clicks collection.
            const clickTimeFilter = Object.keys(clicksDateFilter).length > 0
                ? clicksDateFilter
                : (() => {
                      // Default: clicks from the last 90 days
                      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                      return { $or: [
                          { timestamp: { $gte: since } },
                          { created_at: { $gte: since } },
                      ]};
                  })();

            const allInjectClicks = await db.collection("product_clicks")
                .find(
                    { ...clickTimeFilter, source: { $in: ["zero-results", "inject"] } },
                    { projection: { session_id: 1, product_id: 1, product_name: 1, source: 1, timestamp: 1, time: 1, event_time: 1, search_query: 1 } }
                )
                .toArray();

            console.log(`[inject] cart items: ${cart.length}, inject/zero-results clicks in range: ${allInjectClicks.length}`);

            // ── Build click index for O(1) product lookup instead of O(N×M) scan ──
            // Index by stringified product_id and by product_name
            const clicksByProductId   = {}; // "123" → [click, ...]
            const clicksByProductName = {}; // "Wine X" → [click, ...]
            for (const click of allInjectClicks) {
                if (click.product_id) {
                    const key = String(click.product_id);
                    if (!clicksByProductId[key]) clicksByProductId[key] = [];
                    clicksByProductId[key].push(click);
                }
                if (click.product_name) {
                    const key = click.product_name;
                    if (!clicksByProductName[key]) clicksByProductName[key] = [];
                    clicksByProductName[key].push(click);
                }
            }

            const zeroMatchedSessions = new Set();
            const injectMatchedSessions = new Set();

            for (const cartItem of cart) {
                const cartTime      = getItemTime(cartItem);
                const cartProductId = cartItem.product_id ? String(cartItem.product_id) : null;
                const cartName      = cartItem.product_name || cartItem.name || null;
                const cartSessionId = cartItem.session_id || null;
                if (cartTime === null) continue;

                // Candidate clicks: union of id-matched and name-matched
                const candidateSet = new Set();
                if (cartProductId && clicksByProductId[cartProductId]) {
                    for (const c of clicksByProductId[cartProductId]) candidateSet.add(c);
                }
                if (cartName && clicksByProductName[cartName]) {
                    for (const c of clicksByProductName[cartName]) candidateSet.add(c);
                }
                if (candidateSet.size === 0) continue;

                let bestClick = null;
                for (const click of candidateSet) {
                    const clickTime      = getItemTime(click);
                    const clickSessionId = click.session_id || null;

                    if (clickTime === null) continue;
                    // Click must happen BEFORE the cart add, within the time window
                    if (clickTime > cartTime || cartTime - clickTime > TIME_WINDOW_MS) continue;

                    // Session guard: if both sides have a session_id they MUST match.
                    // If either side lacks a session_id, fall back to time+product match only.
                    if (cartSessionId && clickSessionId && cartSessionId !== clickSessionId) continue;

                    // Pick the click closest in time to the cart add (most relevant)
                    if (!bestClick || cartTime - clickTime < cartTime - getItemTime(bestClick)) {
                        bestClick = click;
                    }
                }

                if (!bestClick) continue;

                const entry = {
                    productId:   cartProductId,
                    productName: cartName,
                    price:        cartItem.price ?? null,
                    product_price: cartItem.product_price ?? null,
                    cartTime:    cartItem.timestamp || cartItem.created_at || null,
                    clickTime:   bestClick.timestamp || bestClick.time || bestClick.event_time || null,
                    searchQuery: bestClick.search_query || null,
                    // Prefer cart session for checkout cross-referencing; fall back to click session
                    sessionId:   cartSessionId || bestClick.session_id || null,
                    source:      bestClick.source,
                };

                if (bestClick.source === "zero-results") {
                    zeroResultsCartCount++;
                    if (cartSessionId) zeroMatchedSessions.add(cartSessionId);
                    zeroResultsItems.push(entry);
                } else if (bestClick.source === "inject") {
                    injectCartCount++;
                    if (cartSessionId) injectMatchedSessions.add(cartSessionId);
                    injectItems.push(entry);
                }
            }
            zeroResultsCartSessions = zeroMatchedSessions.size;
            injectCartSessions = injectMatchedSessions.size;

            // Price enrichment — always prefer the products collection (canonical source)
            // over whatever the cart event stored, since cart events can store stale/wrong prices.
            const allMatchedItems = [...zeroResultsItems, ...injectItems];

            if (allMatchedItems.length > 0) {
                const allIds   = [...new Set(allMatchedItems.map(i => i.productId).filter(Boolean))];
                const allNames = [...new Set(allMatchedItems.map(i => i.productName).filter(Boolean))];
                const priceMap = {};

                // 1. Lookup by name first
                if (allNames.length > 0) {
                    const byName = await db.collection("products")
                        .find(
                            { name: { $in: allNames } },
                            { projection: { id: 1, product_id: 1, name: 1, price: 1, regular_price: 1, sale_price: 1 } }
                        )
                        .toArray();
                    for (const doc of byName) {
                        const rawPrice = (doc.price != null && doc.price !== "") ? doc.price : doc.regular_price;
                        const p = parseFloat(String(rawPrice ?? "").replace(/[^0-9.]/g, ""));
                        if (p > 0) {
                            if (doc.name) priceMap[`name:${doc.name}`] = p;
                            const docId = doc.id ?? doc.product_id;
                            if (docId != null) {
                                priceMap[`id:${docId}`]         = p;
                                priceMap[`id:${Number(docId)}`] = p;
                            }
                        }
                    }
                }

                // 2. ID-based fallback for items whose name didn't resolve, or for items that only have an ID
                const resolvedIds = new Set(
                    Object.keys(priceMap).filter(k => k.startsWith("id:")).map(k => k.slice(3))
                );
                const stillMissingIds = allIds.filter(id => !resolvedIds.has(String(id)) && !resolvedIds.has(String(Number(id))));
                
                if (stillMissingIds.length > 0) {
                    const numericIds = stillMissingIds.map(Number).filter(n => !isNaN(n));
                    const byId = await db.collection("products")
                        .find(
                            { $or: [
                                { id: { $in: [...stillMissingIds, ...numericIds] } },
                                { product_id: { $in: [...stillMissingIds, ...numericIds] } }
                            ]},
                            { projection: { id: 1, product_id: 1, name: 1, price: 1, regular_price: 1, sale_price: 1 } }
                        )
                        .toArray();
                    for (const doc of byId) {
                        const rawPrice = (doc.price != null && doc.price !== "") ? doc.price : doc.regular_price;
                        const p = parseFloat(String(rawPrice ?? "").replace(/[^0-9.]/g, ""));
                        if (p > 0) {
                            const docId = doc.id ?? doc.product_id;
                            if (docId != null) {
                                priceMap[`id:${docId}`]         = p;
                                priceMap[`id:${Number(docId)}`] = p;
                            }
                            if (doc.name) priceMap[`name:${doc.name}`] = p;
                        }
                    }
                }

                // 3. Apply: canonical product price always wins over the cart-event price.
                //    Fall back to the cart-event price only when no product doc was found.
                for (const item of allMatchedItems) {
                    const canonical =
                        priceMap[`name:${item.productName}`] ||
                        (item.productId && priceMap[`id:${item.productId}`]) ||
                        (item.productId && priceMap[`id:${Number(item.productId)}`]) || null;

                    if (canonical != null) {
                        item.price = canonical;
                        item.product_price = canonical;
                    } else {
                        // Canonical lookup failed — prefer product_price over raw price
                        // as it tends to be the actual product list price
                        item.price = item.product_price ?? item.price ?? null;
                    }
                }
            }

            // Calculate total ATC value per group
            const sumPrices = items => items.reduce((sum, i) => {
                const p = parseFloat(String(i.price ?? "").replace(/[^0-9.]/g, "")) || 0;
                return sum + p;
            }, 0);

            zeroResultsCartValue = sumPrices(zeroResultsItems);
            injectCartValue = sumPrices(injectItems);

            // ── Checkout cross-reference ────────────────────────────────────────
            // For each inject/zero-results cart item, check if the same session
            // also produced a checkout event for the same product.
            const checkoutBySession = {};
            for (const co of checkout) {
                const sid = co.session_id;
                if (!sid) continue;
                if (!checkoutBySession[sid]) checkoutBySession[sid] = [];
                checkoutBySession[sid].push(co);
            }

            const tagCheckout = (items) => {
                const checkoutItems = [];
                for (const item of items) {
                    const sid = item.sessionId;
                    if (!sid || !checkoutBySession[sid]) continue;
                    const coEvents = checkoutBySession[sid];

                    let matchedCo = null;
                    let matchedSubItem = null;

                    for (const co of coEvents) {
                        // Top-level product fields
                        const coId   = co.product_id  ? String(co.product_id)  : null;
                        const coName = co.product_name || co.name || null;
                        if ((item.productId && coId && item.productId === coId) ||
                            (item.productName && coName && item.productName === coName)) {
                            matchedCo = co;
                            break;
                        }
                        // Nested products / cart_items arrays
                        const subItems = [
                            ...(Array.isArray(co.products)   ? co.products   : []),
                            ...(Array.isArray(co.cart_items) ? co.cart_items : []),
                        ];
                        const sub = subItems.find(si => {
                            const siId   = si.product_id ? String(si.product_id) : null;
                            const siName = si.product_name || si.name || null;
                            return (item.productId && siId && item.productId === siId) ||
                                   (item.productName && siName && item.productName === siName);
                        });
                        if (sub) { matchedCo = co; matchedSubItem = sub; break; }
                    }

                    if (matchedCo) {
                        // Price preference:
                        //   1. sub-item price (exact per-product price from cart_items/products array)
                        //   2. top-level product_price on the checkout event
                        //   3. the already-enriched ATC item price
                        //   4. cart_total only as last resort (it covers the whole order, not one product)
                        const subPrice = matchedSubItem
                            ? parseFloat(String(matchedSubItem.price ?? matchedSubItem.product_price ?? "").replace(/[^0-9.]/g, ""))
                            : NaN;
                        const coTopPrice = parseFloat(String(matchedCo.product_price ?? matchedCo.price ?? "").replace(/[^0-9.]/g, ""));
                        const atcPrice   = parseFloat(String(item.price ?? "").replace(/[^0-9.]/g, ""));
                        const cartTotal  = parseFloat(String(matchedCo.cart_total ?? "").replace(/[^0-9.]/g, ""));

                        const p = (!isNaN(subPrice)    && subPrice    > 0) ? subPrice    :
                                  (!isNaN(coTopPrice)  && coTopPrice  > 0) ? coTopPrice  :
                                  (!isNaN(atcPrice)    && atcPrice    > 0) ? atcPrice    :
                                  (!isNaN(cartTotal)   && cartTotal   > 0) ? cartTotal   : 0;

                        checkoutItems.push({ ...item, checkoutTime: matchedCo.timestamp || matchedCo.created_at || null, checkoutPrice: p });
                    }
                }
                return checkoutItems;
            };

            zeroResultsCheckoutItems = tagCheckout(zeroResultsItems);
            injectCheckoutItems      = tagCheckout(injectItems);
            zeroResultsCheckoutCount = zeroResultsCheckoutItems.length;
            injectCheckoutCount      = injectCheckoutItems.length;
            zeroResultsCheckoutValue = sumPrices(zeroResultsCheckoutItems.map(i => ({ price: i.checkoutPrice })));
            injectCheckoutValue      = sumPrices(injectCheckoutItems.map(i => ({ price: i.checkoutPrice })));

            console.log(`[inject] zero-results: ${zeroResultsCartCount} ATC (₪${zeroResultsCartValue.toFixed(2)}), ${zeroResultsCheckoutCount} checkout (₪${zeroResultsCheckoutValue.toFixed(2)})`);
            console.log(`[inject] inject:        ${injectCartCount} ATC (₪${injectCartValue.toFixed(2)}), ${injectCheckoutCount} checkout (₪${injectCheckoutValue.toFixed(2)})`);
        } catch (e) {
            console.log("[performance] inject cross-reference skipped:", e.message);
        }

        // Enrich ALL cart items with canonical product prices
        // Cart events can store stale/wrong prices — always prefer the products collection
        try {
            const cartIds   = [...new Set(cart.map(e => e.product_id).filter(Boolean))];
            const cartNames = [...new Set(cart.map(e => e.product_name || e.name).filter(Boolean))];
            const cartPriceMap = {};

            if (cartNames.length > 0) {
                const byName = await db.collection("products")
                    .find(
                        { name: { $in: cartNames } },
                        { projection: { id: 1, product_id: 1, name: 1, price: 1, regular_price: 1 } }
                    )
                    .toArray();
                for (const doc of byName) {
                    const rawPrice = (doc.price != null && doc.price !== "") ? doc.price : doc.regular_price;
                    const p = parseFloat(String(rawPrice ?? "").replace(/[^0-9.]/g, ""));
                    if (p > 0) {
                        if (doc.name) cartPriceMap[`name:${doc.name}`] = p;
                        const docId = doc.id ?? doc.product_id;
                        if (docId != null) {
                            cartPriceMap[`id:${docId}`]         = p;
                            cartPriceMap[`id:${Number(docId)}`] = p;
                        }
                    }
                }
            }

            // ID fallback for names that didn't resolve
            const resolvedIds = new Set(
                Object.keys(cartPriceMap).filter(k => k.startsWith("id:")).map(k => k.slice(3))
            );
            const missingIds = cartIds.filter(id => !resolvedIds.has(String(id)) && !resolvedIds.has(String(Number(id))));
            if (missingIds.length > 0) {
                const numericIds = missingIds.map(Number).filter(n => !isNaN(n));
                const byId = await db.collection("products")
                    .find(
                        { $or: [
                            { id: { $in: [...missingIds, ...numericIds] } },
                            { product_id: { $in: [...missingIds, ...numericIds] } }
                        ]},
                        { projection: { id: 1, product_id: 1, name: 1, price: 1, regular_price: 1 } }
                    )
                    .toArray();
                for (const doc of byId) {
                    const rawPrice = (doc.price != null && doc.price !== "") ? doc.price : doc.regular_price;
                    const p = parseFloat(String(rawPrice ?? "").replace(/[^0-9.]/g, ""));
                    if (p > 0) {
                        const docId = doc.id ?? doc.product_id;
                        if (docId != null) {
                            cartPriceMap[`id:${docId}`]         = p;
                            cartPriceMap[`id:${Number(docId)}`] = p;
                        }
                        if (doc.name) cartPriceMap[`name:${doc.name}`] = p;
                    }
                }
            }

            // Apply canonical prices to every cart item
            for (const item of cart) {
                const canonical =
                    cartPriceMap[`name:${item.product_name || item.name}`] ||
                    (item.product_id && cartPriceMap[`id:${item.product_id}`]) ||
                    (item.product_id && cartPriceMap[`id:${Number(item.product_id)}`]) || null;
                if (canonical != null) {
                    item.price          = canonical;
                    item.product_price  = canonical;
                }
            }
        } catch (e) {
            console.log("[performance] cart price enrichment skipped:", e.message);
        }

        return Response.json({
            cart,
            checkout,
            zeroResultsCartCount,
            zeroResultsCartSessions,
            zeroResultsCartValue,
            zeroResultsItems,
            zeroResultsCheckoutCount,
            zeroResultsCheckoutValue,
            zeroResultsCheckoutItems,
            injectCartCount,
            injectCartSessions,
            injectCartValue,
            injectItems,
            injectCheckoutCount,
            injectCheckoutValue,
            injectCheckoutItems,
            meta: {
                filters: { cart: cartFilter, checkout: checkoutFilter },
                counts: { cart: cart.length, checkout: checkout.length }
            }
        });

    } catch (error) {
        console.error("[API Performance] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
