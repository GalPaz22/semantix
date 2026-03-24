
import { getServerSession } from "next-auth";
import clientPromise from "../../../../../lib/mongodb";
import { authOptions } from "@/lib/auth/options";
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
        // Matching strategy: product id/name + timestamp proximity (click happened up to 2 hours before cart add)
        let zeroResultsCartCount = 0;
        let zeroResultsCartSessions = 0;
        let zeroResultsCartValue = 0;
        let zeroResultsItems = [];
        let injectCartCount = 0;
        let injectCartSessions = 0;
        let injectCartValue = 0;
        let injectItems = [];
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

            const allInjectClicks = await db.collection("product_clicks")
                .find(
                    { ...clicksDateFilter, source: { $in: ["zero-results", "inject"] } },
                    { projection: { session_id: 1, product_id: 1, product_name: 1, source: 1, timestamp: 1, time: 1, event_time: 1, search_query: 1 } }
                )
                .toArray();

            console.log(`[inject] cart items: ${cart.length}, inject/zero-results clicks in range: ${allInjectClicks.length}`);

            const zeroMatchedSessions = new Set();
            const injectMatchedSessions = new Set();

            for (const cartItem of cart) {
                const cartTime = getItemTime(cartItem);
                const cartProductId = cartItem.product_id ? String(cartItem.product_id) : null;
                const cartName = cartItem.product_name || cartItem.name || null;

                for (const click of allInjectClicks) {
                    const clickTime = getItemTime(click);
                    if (clickTime === null || cartTime === null) continue;
                    if (clickTime > cartTime || cartTime - clickTime > TIME_WINDOW_MS) continue;

                    const clickProductId = click.product_id ? String(click.product_id) : null;
                    const clickName = click.product_name || null;

                    const idMatch = cartProductId && clickProductId && cartProductId === clickProductId;
                    const nameMatch = cartName && clickName && cartName === clickName;

                    if (idMatch || nameMatch) {
                        const entry = {
                            productId: cartProductId,
                            productName: cartName,
                            price: cartItem.price ?? cartItem.product_price ?? null,
                            cartTime: cartItem.timestamp || cartItem.created_at || null,
                            clickTime: click.timestamp || click.time || click.event_time || null,
                            searchQuery: click.search_query || null,
                            sessionId: cartItem.session_id || click.session_id || null,
                            source: click.source,
                        };
                        if (click.source === "zero-results") {
                            zeroResultsCartCount++;
                            if (cartItem.session_id) zeroMatchedSessions.add(cartItem.session_id);
                            zeroResultsItems.push(entry);
                        } else if (click.source === "inject") {
                            injectCartCount++;
                            if (cartItem.session_id) injectMatchedSessions.add(cartItem.session_id);
                            injectItems.push(entry);
                        }
                        break; // count each cart item once
                    }
                }
            }
            zeroResultsCartSessions = zeroMatchedSessions.size;
            injectCartSessions = injectMatchedSessions.size;

            // Price enrichment for matched items missing a price
            const allMatchedItems = [...zeroResultsItems, ...injectItems];
            const itemsMissingPrice = allMatchedItems.filter(i => {
                const p = parseFloat(String(i.price ?? "").replace(/[^0-9.]/g, ""));
                return !p || p === 0;
            });

            if (itemsMissingPrice.length > 0) {
                const missingIds = [...new Set(itemsMissingPrice.map(i => i.productId).filter(Boolean))];
                const missingNames = [...new Set(itemsMissingPrice.map(i => i.productName).filter(Boolean))];
                const priceMap = {};

                if (missingIds.length > 0) {
                    const numericIds = missingIds.map(Number).filter(n => !isNaN(n));
                    const byId = await db.collection("products")
                        .find({ id: { $in: [...missingIds, ...numericIds] } }, { projection: { id: 1, name: 1, price: 1, regular_price: 1 } })
                        .toArray();
                    for (const doc of byId) {
                        const p = doc.price || doc.regular_price;
                        if (doc.id != null && p) priceMap[`id:${doc.id}`] = p;
                        if (doc.name && p) priceMap[`name:${doc.name}`] = p;
                    }
                }

                const stillMissingNames = missingNames.filter(n => !priceMap[`name:${n}`]);
                if (stillMissingNames.length > 0) {
                    const byName = await db.collection("products")
                        .find({ name: { $in: stillMissingNames } }, { projection: { name: 1, price: 1, regular_price: 1 } })
                        .toArray();
                    for (const doc of byName) {
                        const p = doc.price || doc.regular_price;
                        if (doc.name && p) priceMap[`name:${doc.name}`] = p;
                    }
                }

                for (const item of allMatchedItems) {
                    const p = parseFloat(String(item.price ?? "").replace(/[^0-9.]/g, ""));
                    if (p && p !== 0) continue;
                    const resolved =
                        (item.productId && priceMap[`id:${item.productId}`]) ||
                        (item.productId && priceMap[`id:${Number(item.productId)}`]) ||
                        priceMap[`name:${item.productName}`] || null;
                    if (resolved != null) item.price = resolved;
                }
            }

            // Calculate total ATC value per group
            const sumPrices = items => items.reduce((sum, i) => {
                const p = parseFloat(String(i.price ?? "").replace(/[^0-9.]/g, "")) || 0;
                return sum + p;
            }, 0);

            zeroResultsCartValue = sumPrices(zeroResultsItems);
            injectCartValue = sumPrices(injectItems);

            console.log(`[inject] zero-results: ${zeroResultsCartCount} (₪${zeroResultsCartValue.toFixed(2)}), inject: ${injectCartCount} (₪${injectCartValue.toFixed(2)})`);
        } catch (e) {
            console.log("[performance] inject cross-reference skipped:", e.message);
        }

        return Response.json({
            cart,
            checkout,
            zeroResultsCartCount,
            zeroResultsCartSessions,
            zeroResultsCartValue,
            zeroResultsItems,
            injectCartCount,
            injectCartSessions,
            injectCartValue,
            injectItems,
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
