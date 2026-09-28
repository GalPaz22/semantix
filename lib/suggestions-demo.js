import clientPromise from "/lib/mongodb";
import { clientSearchAnalytics } from "/lib/client-analytics";

// Demo mode for the suggestions panel (SUGGESTIONS_DEMO=true).
//
// Builds sample suggestions from the store's real failed searches so a demo
// looks like the store's own data, and keeps approve / A/B / dismiss in this
// server process's memory only. Nothing is written to the optimizer, Mongo
// or the live search. State resets when the server restarts.

export const suggestionsDemoEnabled = () => process.env.SUGGESTIONS_DEMO === "true";

const state = new Map(); // dbName -> { decided: Map<id, action>, tests: [] }

function storeState(dbName) {
  if (!state.has(dbName)) state.set(dbName, { decided: new Map(), tests: [] });
  return state.get(dbName);
}

async function buildSuggestions(dbName) {
  const client = await clientPromise;
  const data = await clientSearchAnalytics(client.db(dbName), { days: 30, limit: 10 });
  const zero = data.failedSearches.zeroResults;
  const idle = data.failedSearches.noEngagement;
  const top = data.topSearches.find((r) => r.searches >= 5 && r.cartAdds > 0 && r.clicks > 0);

  const out = [];
  if (zero[0]) {
    out.push({
      id: "demo-zero",
      kind: "ranking",
      title: `להציג מוצרים קרובים בחיפוש "${zero[0].query}"`,
      summary: `החיפוש "${zero[0].query}" חזר ${zero[0].searches} פעמים בחודש האחרון בלי אף תוצאה. מוצע להציג בו את המוצרים הקרובים ביותר מהקטלוג, כדי שהגולש לא יעזוב בידיים ריקות.`,
      queries: zero.slice(0, 3).map((z) => z.query),
      productCount: null,
      canApply: true,
      canTest: true,
    });
  }
  if (idle[0]) {
    out.push({
      id: "demo-idle",
      kind: "ranking",
      title: `לקדם את המוצרים הנמכרים בחיפוש "${idle[0].query}"`,
      summary: `בחיפוש "${idle[0].query}" הוצגו תוצאות ${idle[0].searches} פעמים, אבל אף גולש לא לחץ או הוסיף לעגלה. מוצע להעלות לראש הרשימה את המוצרים שנמכרים הכי הרבה בקטגוריה.`,
      queries: idle.slice(0, 3).map((z) => z.query),
      productCount: null,
      canApply: true,
      canTest: true,
    });
  }
  if (top) {
    out.push({
      id: "demo-top",
      kind: "ranking",
      title: `לנעוץ את המוצר המוביל בחיפוש "${top.query}"`,
      summary: `"${top.query}" הוא אחד החיפושים הנפוצים (${top.searches} חיפושים) ומגיע לעגלה ${top.cartAdds} פעמים. מוצע לנעוץ בראש התוצאות את המוצר שהכי הרבה גולשים הוסיפו לעגלה.`,
      queries: [top.query],
      productCount: null,
      canApply: true,
      canTest: true,
    });
  }
  return out;
}

export async function demoSuggestions(dbName) {
  const s = storeState(dbName);
  const suggestions = (await buildSuggestions(dbName)).filter((x) => !s.decided.has(x.id));
  return { available: true, demo: true, suggestions, tests: s.tests };
}

export async function demoAction(dbName, id, action) {
  const s = storeState(dbName);
  const suggestion = (await buildSuggestions(dbName)).find((x) => x.id === id);
  if (!suggestion || s.decided.has(id)) return false;
  s.decided.set(id, action);
  const now = new Date().toISOString();
  if (action === "apply") {
    s.tests.unshift({ id, title: suggestion.title, status: "promoted", startedAt: null, appliedAt: now, sessions: 0, winProbability: null, winMetric: null });
  } else if (action === "test") {
    s.tests.unshift({ id, title: suggestion.title, status: "running", startedAt: now, appliedAt: null, sessions: 0, winProbability: null, winMetric: null });
  }
  return true;
}
