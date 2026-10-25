// Demo catalog and search results for the results editor (pin / remove). Static data.

export const CATALOG = {
  fr265: { name: "Forerunner 265", category: "ריצה", price: 1799, stock: "in", conversion: 7.4, aliases: ["forerunner 265", "265"] },
  fr970: { name: "Forerunner 970", category: "ריצה", price: 3299, stock: "in", conversion: 9.2, aliases: ["forerunner 970", "970"] },
  fr165: { name: "Forerunner 165", category: "ריצה", price: 1199, stock: "in", conversion: 6.1, aliases: ["forerunner 165", "165"] },
  fr965: { name: "Forerunner 965", category: "ריצה", price: 2699, stock: "low", conversion: 5.8, aliases: ["forerunner 965", "965"] },
  fr55: { name: "Forerunner 55", category: "ריצה", price: 899, stock: "in", conversion: 3.9, aliases: ["forerunner 55"] },
  hrm: { name: "HRM-Pro Plus", category: "אביזרים", price: 549, stock: "in", conversion: 8.1, aliases: ["hrm", "חיישן דופק", "רצועת דופק"] },
  band: { name: "רצועת QuickFit 22mm", category: "אביזרים", price: 199, stock: "in", conversion: 9.4, aliases: ["רצועה", "quickfit"] },
  cable: { name: "כבל טעינה Garmin", category: "אביזרים", price: 89, stock: "in", conversion: 11.2, aliases: ["כבל", "מטען"] },
  f8s51: { name: "fēnix 8 Solar 51mm", category: "הרפתקאות", price: 4599, stock: "in", conversion: 2.1, aliases: ["fenix 8 solar", "פיניקס 8 סולאר", "סולאר"] },
  f8a47: { name: "fēnix 8 AMOLED 47mm", category: "הרפתקאות", price: 4199, stock: "in", conversion: 7.8, aliases: ["fenix 8 amoled", "fenix 8", "fēnix 8", "פיניקס 8", "פניקס 8"] },
  f9a47: { name: "fēnix 9 AMOLED 47mm", category: "הרפתקאות", price: 4799, stock: "in", conversion: null, isNew: true, aliases: ["fenix 9 amoled"] },
  f9p51: { name: "fēnix 9 Pro 51mm", category: "הרפתקאות", price: 5299, stock: "in", conversion: null, isNew: true, aliases: ["fenix 9 pro", "fenix 9", "fēnix 9", "פיניקס 9", "פניקס 9"] },
  fe: { name: "fēnix E", category: "הרפתקאות", price: 2999, stock: "in", conversion: 4.4, aliases: ["fenix e", "פיניקס e"] },
  epix: { name: "epix Pro Gen 2", category: "הרפתקאות", price: 3999, stock: "out", conversion: 3.2, aliases: ["epix", "אפיקס"] },
  venu3: { name: "Venu 3", category: "סמארטווץ׳", price: 1899, stock: "in", conversion: 6.8, aliases: ["venu 3", "ונו 3"] },
  venu3s: { name: "Venu 3S", category: "סמארטווץ׳", price: 1899, stock: "in", conversion: 6.2, aliases: ["venu 3s", "ונו 3s"] },
  va6: { name: "vívoactive 6", category: "סמארטווץ׳", price: 1499, stock: "in", conversion: 5.9, aliases: ["vivoactive", "ויבואקטיב"] },
  lily2: { name: "Lily 2", category: "סמארטווץ׳", price: 1099, stock: "out", conversion: 1.4, aliases: ["lily", "לילי"] },
  vivomove: { name: "vívomove Trend", category: "סמארטווץ׳", price: 1299, stock: "low", conversion: 3.6, aliases: ["vivomove", "ויבומוב"] },
  instinct3: { name: "Instinct 3 AMOLED", category: "הרפתקאות", price: 1799, stock: "in", conversion: 5.2, aliases: ["instinct", "אינסטינקט"] },
  instinctE: { name: "Instinct E", category: "הרפתקאות", price: 1199, stock: "in", conversion: 4.8, aliases: ["instinct e"] },
  f8pro: { name: "fēnix 8 Pro 47mm", category: "הרפתקאות", price: 5499, stock: "low", conversion: 4.1, aliases: ["fenix 8 pro", "פיניקס 8 פרו"] },
  venuX1: { name: "Venu X1", category: "סמארטווץ׳", price: 3799, stock: "in", conversion: 3.3, isNew: true, aliases: ["venu x1", "ונו x1"] },
  fr165m: { name: "Forerunner 165 Music", category: "ריצה", price: 1449, stock: "in", conversion: 5.6, aliases: ["forerunner 165 music", "165 music"] },
  bounce2: { name: "Bounce 2", category: "ילדים", price: 999, stock: "in", conversion: 4.9, aliases: ["bounce", "באונס", "שעון לילד"] },
  vivofitjr: { name: "vívofit jr. 3", category: "ילדים", price: 399, stock: "in", conversion: 6.3, aliases: ["vivofit jr", "ויבופיט"] },
  descentMk3: { name: "Descent Mk3", category: "צלילה", price: 4299, stock: "in", conversion: 4.6, aliases: ["descent mk3", "descent", "דיסנט"] },
  descentG2: { name: "Descent G2", category: "צלילה", price: 2199, stock: "in", conversion: 5.1, aliases: ["descent g2"] },
  approachS70: { name: "Approach S70", category: "גולף", price: 2499, stock: "in", conversion: 3.8, aliases: ["approach", "שעון גולף", "גולף"] },
  edge540: { name: "Edge 540", category: "רכיבה", price: 1599, stock: "in", conversion: 4.4, aliases: ["edge 540", "edge", "אדג׳"] },
  edge1050: { name: "Edge 1050", category: "רכיבה", price: 2699, stock: "low", conversion: 3.9, aliases: ["edge 1050"] },
  inreach: { name: "inReach Messenger Plus", category: "תקשורת לווינית", price: 1899, stock: "in", conversion: 2.7, aliases: ["inreach", "לווין"] },
  indexS2: { name: "Index S2 משקל חכם", category: "בריאות", price: 849, stock: "in", conversion: 3.1, aliases: ["index", "משקל"] },
  screen: { name: "מגן מסך fēnix 8", category: "אביזרים", price: 79, stock: "in", conversion: 10.4, aliases: ["מגן מסך"] },
};

export const QUERY_RESULTS = {
  "שעון ריצה": ["fr265", "fr165", "fr965", "fr55", "venu3", "va6", "fr970", "hrm"],
  "fenix": ["f8s51", "f8a47", "fe", "epix", "f9a47", "f9p51", "instinct3", "cable"],
  "שעון לנשים": ["lily2", "venu3s", "va6", "vivomove", "fr165", "venu3"],
  "שעון חכם": ["venu3", "va6", "venu3s", "fr265", "lily2", "vivomove", "instinct3"],
};

export const EDITOR_QUERIES = Object.keys(QUERY_RESULTS);

// Any other query gets a plausible best-sellers list.
export function resultsFor(query) {
  const key = Object.keys(QUERY_RESULTS).find(k => k.toLowerCase() === query.trim().toLowerCase());
  return QUERY_RESULTS[key] || ["fr265", "f8a47", "venu3", "fr165", "instinct3", "va6"];
}

export function findProduct(text) {
  const q = text.toLowerCase();
  // Longest alias first, so "fenix 8 solar" beats "fenix 8".
  const hits = Object.entries(CATALOG).flatMap(([id, p]) => p.aliases.map(a => [a, id])).filter(([a]) => q.includes(a.toLowerCase()));
  hits.sort((a, b) => b[0].length - a[0].length);
  return hits.length ? { id: hits[0][1], ...CATALOG[hits[0][1]] } : null;
}

// ---- Remove commands ("תסלק את Lily 2 מחיפוש ״שעון לנשים״") -----------------
const REMOVE_VERBS = ["תסלק", "סלק", "סילוק", "תסיר", "הסר", "תוריד", "הורד", "תסתיר", "הסתר", "להסיר", "remove", "hide", "exclude"];

export function buildRemoveReply(question) {
  const q = question.toLowerCase();
  if (!REMOVE_VERBS.some(v => q.includes(v))) return null;
  const quoted = question.match(/[״"“]([^״"”]+)[״"”]/)?.[1]?.trim();
  const p = findProduct(question.replace(/[״"“][^״"”]*[״"”]/g, " "));
  const name = p?.name || "המוצר";
  const target = quoted || "כל החיפושים";
  const why = p?.stock === "out"
    ? `**${name}** אזל במלאי, אבל עדיין מופיע בחיפוש – ולכן לקוחות נכנסים אליו ונוטשים (${p.conversion}% המרה).`
    : p
      ? `**${name}** מופיע כרגע ב-${target === "כל החיפושים" ? "11 חיפושים" : `חיפוש ״${target}״`}. הסרה לא מוחקת אותו מהקטלוג – רק מהתוצאות.`
      : "לא זיהיתי מוצר מדויק בפקודה, אז הכנתי הסרה לפי השם שכתבת.";
  const rest = resultsFor(quoted || "").filter(id => id !== p?.id).slice(0, 3).map(id => CATALOG[id].name);

  return {
    blocks: [
      { type: "text", text: why },
      {
        type: "action",
        actionType: "exclude",
        title: "הסרה מהתוצאות",
        details: [
          ["מוצר", name],
          ["חיפושים", target],
          ["משך", p?.stock === "out" ? "עד שיחזור למלאי – ואז חוזר אוטומטית" : "קבוע, עד ביטול"],
          ["נשאר בקטלוג", "כן – רק מוסתר מהחיפוש"],
        ],
        preview: rest,
        effect: p ? { kind: "remove", ids: [p.id], query: quoted || null } : null,
      },
    ],
  };
}

// Applies an approved chat action to the editor's per-query rules.
export function applyEffect(rules, effect) {
  if (!effect) return rules;
  const queries = effect.query
    ? [effect.query]
    : Object.keys(QUERY_RESULTS).filter(k => effect.ids.some(id => QUERY_RESULTS[k].includes(id)));
  const next = { ...rules };
  const without = list => (list || []).filter(id => !effect.ids.includes(id));
  queries.forEach(q => {
    const cur = { pinned: [], removed: [], added: [], ...next[q] };
    // Removing a manually added product just un-adds it; organic results get hidden.
    const hide = effect.ids.filter(id => !(cur.added || []).includes(id));
    if (effect.kind === "remove") next[q] = { ...cur, pinned: without(cur.pinned), added: without(cur.added), removed: [...without(cur.removed), ...hide] };
    else if (effect.kind === "add") next[q] = { ...cur, removed: without(cur.removed), added: [...without(cur.added), ...effect.ids] };
    else next[q] = { ...cur, pinned: [...effect.ids, ...without(cur.pinned)], removed: without(cur.removed) };
  });
  return next;
}

// ---- Add commands ("תוסיף את Bounce 2 לחיפוש ״שעון לילד״") -------------------
const ADD_VERBS = ["תוסיף", "הוסף", "להוסיף", "תכניס"];

export function buildAddReply(question) {
  const q = question.toLowerCase();
  if (!ADD_VERBS.some(v => q.includes(v))) return null;
  const quoted = question.match(/[״"“]([^״"”]+)[״"”]/)?.[1]?.trim();
  const p = findProduct(question.replace(/[״"“][^״"”]*[״"”]/g, " "));
  if (!p) {
    return { blocks: [{ type: "text", text: "לא מצאתי את המוצר בקטלוג. נסה לכתוב את שם הדגם, למשל ״תוסיף את Bounce 2 לחיפוש ״שעון לילד״״ – או הוסף אותו ידנית בפאנל ניהול התוצאות." }] };
  }
  if (!quoted) {
    return { blocks: [{ type: "text", text: `לאיזה חיפוש להוסיף את **${p.name}**? כתוב את החיפוש במירכאות, למשל ״תוסיף את ${p.name} לחיפוש ״שעון ריצה״״.` }] };
  }
  const already = resultsFor(quoted).includes(p.id);
  const rest = resultsFor(quoted).filter(id => id !== p.id).slice(0, 2).map(id => CATALOG[id].name);
  return {
    blocks: [
      {
        type: "text",
        text: already
          ? `**${p.name}** כבר מופיע בתוצאות של ״${quoted}״ – אבל נמוך. אוסיף אותו כתוצאה ידנית כדי שיופיע מיד אחרי המוצרים הנעוצים.`
          : `**${p.name}** לא מופיע היום בחיפוש ״${quoted}״. אוסיף אותו מהקטלוג כתוצאה ידנית – הוא יופיע מיד אחרי המוצרים הנעוצים.`,
      },
      {
        type: "action",
        actionType: "add",
        title: "הוספת מוצר לתוצאות",
        details: [
          ["מוצר", p.name],
          ["חיפוש", quoted],
          ["מיקום", "אחרי המוצרים הנעוצים"],
          ["מלאי", p.stock === "out" ? "אזל – כדאי לשקול" : p.stock === "low" ? "מלאי נמוך" : "במלאי"],
        ],
        preview: [p.name, ...rest],
        effect: { kind: "add", ids: [p.id], query: quoted },
      },
    ],
  };
}
