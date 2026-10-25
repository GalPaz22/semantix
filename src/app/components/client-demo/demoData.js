// Static demo data for the Garmin client dashboard. Not connected to any real store data.

export const DEMO_STORE = { name: "Garmin Israel", domain: "garmin.co.il", initials: "GI", currency: "₪" };

export const RANGES = [
  { id: "7d", label: "7 ימים", days: 7, scale: 0.235 },
  { id: "30d", label: "30 ימים", days: 30, scale: 1 },
  { id: "90d", label: "90 ימים", days: 90, scale: 2.91 },
];

const BASE = {
  searches: 86450,
  searchers: 17900,
  orders: 1002,
  searchRevenue: 1284600,
  siteRevenue: 3128000,
};

export function getKpis(rangeId) {
  const r = RANGES.find(x => x.id === rangeId) ?? RANGES[1];
  const tweak = { "7d": 0.3, "30d": 0, "90d": -0.25 }[r.id];
  return {
    searches: Math.round(BASE.searches * r.scale),
    searchers: Math.round(BASE.searchers * r.scale),
    orders: Math.round(BASE.orders * r.scale),
    searchRevenue: Math.round(BASE.searchRevenue * r.scale / 100) * 100,
    searchShare: 41,
    searchConversion: +(5.6 + tweak).toFixed(1),
    siteConversion: 1.7,
    aov: 1282 + ({ "7d": 38, "30d": 0, "90d": -21 }[r.id]),
    zeroResultRate: +(4.1 - tweak / 2).toFixed(1),
    deltas: { searchConversion: 0.8, searchRevenue: 22.4, searches: 14.7, zeroResultRate: -1.6 },
  };
}

// Deterministic daily series with weekday rhythm and a Yom Kippur dip (21.09).
export function getTrend(rangeId) {
  const r = RANGES.find(x => x.id === rangeId) ?? RANGES[1];
  const end = new Date("2026-09-28T12:00:00");
  const out = [];
  for (let i = r.days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const dow = d.getDay();
    const t = (r.days - i) / r.days;
    let f = 1 + Math.sin(i * 0.9) * 0.035 + Math.cos(i * 0.45) * 0.03;
    if (dow === 5) f *= 0.9;
    if (dow === 6) f *= 0.8;
    if (dow === 0) f *= 1.06;
    const isKippur = d.getDate() === 21 && d.getMonth() === 8;
    if (isKippur) f *= 0.45;
    const revenue = Math.round(38500 * (0.9 + t * 0.22) * f);
    const previous = Math.round(33200 * (0.96 + Math.sin(i * 0.7) * 0.04) * (dow === 6 ? 0.8 : dow === 5 ? 0.9 : 1));
    const searches = Math.round(2600 * (0.92 + t * 0.16) * f);
    out.push({
      date: d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
      revenue,
      previous,
      searches,
      conversion: +(4.9 + t * 1.2 + Math.sin(i * 0.9) * 0.35).toFixed(2),
      zero: +(5.2 - t * 1.4 + Math.sin(i * 1.3) * 0.3).toFixed(2),
    });
  }
  return out;
}

export const FUNNEL = [
  { stage: "ביקורים עם חיפוש", value: 17900 },
  { stage: "הקלקה על מוצר", value: 11280 },
  { stage: "הוספה לסל", value: 2410 },
  { stage: "רכישה", value: 1002 },
];

export const TOP_SEARCHES = [
  { query: "forerunner 265", searches: 6840, ctr: 71, conversion: 7.4, revenue: 182300, trend: [4, 5, 5, 6, 7, 7, 8] },
  { query: "fenix 8", searches: 5120, ctr: 66, conversion: 5.9, revenue: 241700, trend: [6, 5, 6, 6, 7, 8, 8] },
  { query: "שעון ריצה", searches: 4730, ctr: 58, conversion: 6.1, revenue: 118400, trend: [5, 5, 6, 5, 6, 6, 7] },
  { query: "venu 3", searches: 3960, ctr: 63, conversion: 6.8, revenue: 96200, trend: [7, 6, 6, 5, 6, 5, 5] },
  { query: "שעון לנשים", searches: 3410, ctr: 49, conversion: 4.9, revenue: 71500, trend: [4, 4, 5, 5, 5, 6, 6] },
  { query: "instinct 3", searches: 2880, ctr: 61, conversion: 5.2, revenue: 58900, trend: [3, 4, 4, 5, 5, 6, 7] },
  { query: "מחשב אופניים", searches: 2240, ctr: 54, conversion: 4.4, revenue: 49800, trend: [5, 5, 4, 4, 5, 4, 4] },
  { query: "רצועה", searches: 2110, ctr: 68, conversion: 8.9, revenue: 21600, trend: [4, 5, 5, 5, 6, 6, 6] },
];

// Failures the agent detected and fixed on its own (no approval needed).
export const FAILED_SEARCHES = [
  { query: "שעון עם סים", searches: 1120, type: "zero", recovered: 27300, note: "המונח ״סים״ לא הופיע – דגמי LTE קיימים בקטלוג", fix: "תויגו 9 דגמי LTE כ״סים / eSIM״", when: "לפני 3 שעות" },
  { query: "פוררנר", searches: 910, type: "zero", recovered: 38400, note: "תעתיק עברי של Forerunner – חסרה מילה נרדפת", fix: "נוספה מילה נרדפת לסדרת Forerunner", when: "אתמול" },
  { query: "שעון לילד", searches: 780, type: "no_buy", recovered: 8900, note: "Bounce 2 הופיע רק בעמוד 2", fix: "Bounce 2 ו-vívofit jr. הוקפצו לראש", when: "אתמול" },
  { query: "מטען לפניקס", searches: 690, type: "no_click", recovered: 9600, note: "הוצגו שעונים במקום כבל טעינה", fix: "נוסף כלל כוונה: אביזרים קודם", when: "לפני יומיים" },
  { query: "שעון לצלילה", searches: 640, type: "no_click", recovered: 21800, note: "סדרת Descent התחילה רק במקום 7", fix: "סדרת Descent קודמה לראש התוצאות", when: "לפני 3 ימים" },
  { query: "שעון עם תשלום", searches: 430, type: "zero", recovered: 12500, note: "Garmin Pay לא היה מתויג במוצרים", fix: "תויגו 34 דגמים עם Garmin Pay", when: "לפני 4 ימים" },
];

export const TOP_PRODUCTS = [
  { name: "Forerunner 265", category: "ריצה", orders: 214, revenue: 384900 },
  { name: "fēnix 8 AMOLED 47mm", category: "הרפתקאות", orders: 71, revenue: 291100 },
  { name: "Venu 3", category: "סמארטווץ׳", orders: 98, revenue: 186200 },
  { name: "Forerunner 165", category: "ריצה", orders: 112, revenue: 134300 },
  { name: "Instinct 3 AMOLED", category: "הרפתקאות", orders: 57, revenue: 102500 },
  { name: "Edge 540", category: "רכיבה", orders: 41, revenue: 65600 },
];

// Conversion optimizations that need a business decision (approve / A/B / dismiss).
export const SUGGESTIONS = [
  {
    id: "s1",
    kind: "rerank",
    kindLabel: "סדר תוצאות",
    title: "לקדם דגמים זמינים במלאי בחיפוש ״שעון לנשים״",
    reason: "38% מההקלקות הולכות ל-Lily 2 בצבעים שאזלו. לקוחות נכנסים לעמוד המוצר ונוטשים.",
    impact: { revenue: 24600, conversion: 0.28 },
    confidence: 3,
    before: "Lily 2 (אזל ב-2 צבעים) בראש",
    after: "Venu 3S, vívoactive 6, Lily 2 במלאי",
  },
  {
    id: "s2",
    kind: "enrich",
    kindLabel: "מוצרים משלימים",
    title: "להציג HRM-Pro ורצועות ליד תוצאות שעוני ריצה",
    reason: "31% מרוכשי Forerunner קונים גם חיישן דופק או רצועה – אבל רק אחרי חיפוש נוסף. אפשר לחסוך להם את הצעד.",
    impact: { revenue: 19800, conversion: 0.12 },
    confidence: 2,
    before: "שעונים בלבד בתוצאות",
    after: "שורת ״נקנה יחד״ מתחת ל-3 התוצאות הראשונות",
  },
  {
    id: "s3",
    kind: "pin",
    kindLabel: "הצמדת מוצר",
    title: "להצמיד את Forerunner 970 למקום 2 בחיפוש ״שעון ריצה״",
    reason: "מי שמקליק עליו ממיר ב-9.2% – כמעט פי 1.5 מהממוצע בחיפוש הזה, עם הסל הגבוה בקטגוריה. כרגע הוא במקום 8.",
    impact: { revenue: 17200, conversion: 0.15 },
    confidence: 3,
    before: "מקום 8",
    after: "מקום 2, ל-14 יום ואז בדיקה אוטומטית",
  },
  {
    id: "s4",
    kind: "rerank",
    kindLabel: "סדר תוצאות",
    title: "להציג קודם את fēnix 8 AMOLED 47mm בחיפוש ״fenix 8״",
    reason: "גרסת Solar 51mm מוצגת ראשונה אבל ממירה ב-2.1% בלבד. AMOLED 47mm היא הנמכרת ביותר עם 7.8% המרה.",
    impact: { revenue: 14900, conversion: 0.11 },
    confidence: 2,
    before: "fēnix 8 Solar 51mm ראשון",
    after: "fēnix 8 AMOLED 47mm ראשון",
  },
  {
    id: "s5",
    kind: "intent",
    kindLabel: "הבנת כוונה",
    title: "לזהות חיפושי מתנה ולהציג דגמים עד ₪1,500",
    reason: "חיפושי ״מתנה״ עלו פי 2.4 לקראת החגים. היום מוצגים ראשונים דגמי פרימיום ב-₪4,000+ – ורוב המחפשים נוטשים.",
    impact: { revenue: 9400, conversion: 0.09 },
    confidence: 2,
    before: "fēnix ו-Epix בראש",
    after: "Forerunner 165, Venu Sq 2, Lily 2",
  },
];

export const AGENT_STARTERS = [
  "מה החיפושים המובילים החודש?",
  "איפה לקוחות נוטשים?",
  "מה קונים אחרי שמחפשים שעון ריצה?",
  "מה תיקנת אוטומטית השבוע?",
  "קדם את Forerunner 970 בחיפוש ״שעון ריצה״",
  "תקדם את שעוני פיניקס 9 החדשים",
  "תסלק את Lily 2 מחיפוש ״שעון לנשים״",
  "תוסיף את Bounce 2 לחיפוש ״שעון לילד״",
];

// Scripted agent replies, matched in order by keywords in the question.
// Block types: text, table, bullets, bars, action (a studio-style fix to approve).
export const AGENT_SCRIPT = [
  {
    match: ["תיקנת", "אוטומטי", "תוקן", "פוררנר", "סים", "מטען", "צלילה"],
    blocks: [
      { type: "text", text: "השבוע זיהיתי ותיקנתי **6 חיפושים כושלים** – בלי צורך באישור, כי כולם היו חיפושים עם 0 תוצאות או תוצאות לא רלוונטיות:" },
      {
        type: "table",
        columns: ["חיפוש", "מה עשיתי", "הוחזר לחודש"],
        rows: [
          ["פוררנר", "מילה נרדפת לסדרת Forerunner", "₪38,400"],
          ["שעון עם סים", "תויגו 9 דגמי LTE", "₪27,300"],
          ["שעון לצלילה", "Descent קודם לראש", "₪21,800"],
          ["שעון עם תשלום", "תויגו 34 דגמים עם Garmin Pay", "₪12,500"],
          ["מטען לפניקס", "כלל כוונה: אביזרים קודם", "₪9,600"],
          ["שעון לילד", "Bounce 2 הוקפץ לראש", "₪8,900"],
        ],
      },
      { type: "text", text: "סה״כ **₪118,500 בחודש** שחזרו לחיפוש. שיעור החיפושים ללא תוצאות ירד מ-5.7% ל-4.1%. כל תיקון ניתן לביטול בלחיצה, ואני ממשיך לנטר אותם." },
    ],
  },
  {
    match: ["לנשים", "lily"],
    blocks: [
      { type: "text", text: "ב-״שעון לנשים״ הבעיה היא לא החיפוש אלא המלאי: 38% מההקלקות הולכות ל-Lily 2 בצבעים שאזלו. זה שינוי בסדר התוצאות, אז הוא דורש את האישור שלך:" },
      {
        type: "action",
        actionType: "rerank",
        title: "סדר תוצאות",
        details: [
          ["חיפוש", "שעון לנשים (+ שעון נשים, שעון יד לאישה)"],
          ["כלל", "מוצרים עם מלאי מלא קודם"],
          ["חל על", "3,410 חיפושים בחודש"],
          ["השפעה משוערת", "+₪24,600 בחודש"],
        ],
        preview: ["Venu 3S", "vívoactive 6", "Lily 2 – Black"],
      },
    ],
  },
  {
    match: ["מוביל", "הכי", "פופולר", "top"],
    blocks: [
      { type: "text", text: "ב-30 הימים האחרונים היו **86,450 חיפושים**. חמשת המובילים מייצרים לבד 55% מההכנסה מהחיפוש:" },
      {
        type: "table",
        columns: ["חיפוש", "חיפושים", "המרה", "הכנסה"],
        rows: [
          ["forerunner 265", "6,840", "7.4%", "₪182,300"],
          ["fenix 8", "5,120", "5.9%", "₪241,700"],
          ["שעון ריצה", "4,730", "6.1%", "₪118,400"],
          ["venu 3", "3,960", "6.8%", "₪96,200"],
          ["שעון לנשים", "3,410", "4.9%", "₪71,500"],
        ],
      },
      { type: "text", text: "שווה לשים לב ל-״שעון לנשים״: נפח גבוה אבל המרה נמוכה מהממוצע. 38% מההקלקות הולכות ל-Lily 2, שחסר במלאי בשני צבעים." },
    ],
  },
  {
    match: ["נוטש", "נטישה", "עוזב", "כושל", "נכשל"],
    blocks: [
      { type: "text", text: "את החיפושים הכושלים (0 תוצאות ותוצאות לא רלוונטיות) כבר תיקנתי אוטומטית. מה שנשאר הן נקודות נטישה שדורשות החלטה עסקית – יחד הן שוות כ-**₪86,000 בחודש**:" },
      {
        type: "bullets",
        items: [
          "**מלאי** – ״שעון לנשים״: 38% מההקלקות הולכות ל-Lily 2 בצבעים שאזלו.",
          "**סדר תוצאות** – ״fenix 8״: הגרסה שמוצגת ראשונה ממירה ב-2.1% בלבד, הנמכרת ביותר מופיעה שנייה.",
          "**מחיר מול כוונה** – חיפושי ״מתנה״ מקבלים קודם דגמים ב-₪4,000+.",
        ],
      },
      { type: "text", text: "רוצה שאתחיל מ-״שעון לנשים״? זה השיפור עם ההשפעה הגדולה ביותר." },
    ],
  },
  {
    match: ["קונים", "רוכשים", "רכישה", "מוכר"],
    blocks: [
      { type: "text", text: "מי שמחפש ״שעון ריצה״ קונה בסוף בעיקר את הדגמים האלה (חלק מההכנסה מהחיפוש הזה):" },
      {
        type: "bars",
        items: [
          { label: "Forerunner 265", value: 46, display: "46%" },
          { label: "Forerunner 165", value: 24, display: "24%" },
          { label: "Forerunner 970", value: 14, display: "14%" },
          { label: "Forerunner 965", value: 9, display: "9%" },
          { label: "אחר", value: 7, display: "7%" },
        ],
      },
      { type: "text", text: "31% מהם מוסיפים לסל גם **חיישן דופק HRM** או רצועה – הזדמנות להצגת אביזרים משלימים בעמוד התוצאות. סל ממוצע: ₪1,640." },
    ],
  },
];

export const AGENT_FALLBACK = {
  blocks: [
    { type: "text", text: "בדקתי את נתוני החיפוש של Garmin Israel. בחודש האחרון החיפוש הניב **₪1,284,600** – 41% מהמכירות באתר, עם יחס המרה של 5.6% לעומת 1.7% בגלישה רגילה." },
    { type: "text", text: "אפשר לשאול אותי על חיפושים ספציפיים, דגמים, נקודות נטישה או מה נקנה – או לבקש תיקון: מילים נרדפות, הצמדת מוצרים, קידום או כללי כוונה." },
  ],
};

// ---- Promote commands ("תקדם את שעוני פיניקס 9 החדשים") ----------------------
// Checked before AGENT_SCRIPT, so a promote verb always wins over topic keywords.
const PIN_VERBS = ["תנעץ", "נעץ", "נעיצה", "לנעוץ", "הצמד", "תצמיד", "pin"];
const PROMOTE_VERBS = ["תקדם", "קדם", "קידום", "להקפיץ", "תקפיץ", "הקפץ", "בוסט", "תבליט", "הבלט", "boost", "promote", ...PIN_VERBS];

const PROMOTABLE = [
  { aliases: ["fenix 8", "fēnix 8", "פיניקס 8", "פניקס 8"], name: "fēnix 8 AMOLED 47mm", from: 2, searches: "fenix · פניקס · שעון הרפתקאות", preview: ["fēnix 8 AMOLED 47mm", "fēnix 8 Pro 51mm", "fēnix E"] },
  {
    aliases: ["fenix 9", "fēnix 9", "fenix9", "פיניקס 9", "פניקס 9", "פיניקס9", "פניקס9", "פיניקס", "פניקס", "fenix", "fēnix"],
    intro: "מצאתי **3 דגמי fēnix 9** שנוספו לקטלוג לפני 6 ימים. כרגע הם מופיעים רק **במקומות 6 עד 11** בחיפוש ״fenix״ – כי אין להם עדיין היסטוריית מכירות, והדירוג מעדיף את fēnix 8 שנמכר הרבה.",
    details: [
      ["מוצרים", "3 דגמי fēnix 9 החדשים"],
      ["חיפושים", "fenix · פניקס · שעון הרפתקאות · שעון טריאתלון ועוד 14"],
      ["מיקום", "מקומות 6 עד 11 ← מקומות 1 עד 3"],
      ["משך", "30 יום, ואז לפי ביצועים"],
      ["חשיפה צפויה", "כ-7,900 מחפשים בחודש"],
    ],
    preview: ["fēnix 9 Pro 51mm", "fēnix 9 AMOLED 47mm", "fēnix 8 AMOLED 47mm"],
    effect: { ids: ["f9p51", "f9a47"], query: "fenix" },
    outro: "fēnix 8 נשאר במקום 3 כדי לא לפגוע במכירות שלו. אם תרצה, אפשר להריץ קודם A/B ולראות אם הקידום לא מוריד את ההמרה בחיפוש.",
  },
  {
    aliases: ["forerunner 970", "פוררנר 970", "970"],
    intro: "Forerunner 970 נמצא כרגע **במקום 8** בחיפוש ״שעון ריצה״. מי שמקליק עליו ממיר ב-9.2% – כמעט פי 1.5 מהממוצע בחיפוש הזה, והסל שלו הגבוה בקטגוריה.",
    details: [
      ["מוצר", "Forerunner 970"],
      ["חיפושים", "שעון ריצה · שעון לריצה · running watch"],
      ["מיקום", "מקום 8 ← מקום 2"],
      ["משך", "14 יום, ואז בדיקה אוטומטית"],
      ["השפעה משוערת", "+₪17,200 בחודש"],
    ],
    preview: ["Forerunner 265", "Forerunner 970", "Forerunner 165"],
    effect: { ids: ["fr970"], query: "שעון ריצה" },
  },
  { aliases: ["venu 3", "ונו 3", "venu"], name: "Venu 3", from: 5, searches: "venu · שעון חכם · סמארטווץ׳", preview: ["Venu 3", "Venu 3S", "vívoactive 6"] },
  { aliases: ["instinct 3", "אינסטינקט", "instinct"], name: "Instinct 3", from: 4, searches: "instinct · שעון שטח · שעון עמיד", preview: ["Instinct 3 AMOLED", "Instinct 3 Solar", "Instinct E"] },
  { aliases: ["forerunner 265", "265"], name: "Forerunner 265", from: 3, searches: "שעון ריצה · forerunner", preview: ["Forerunner 265", "Forerunner 965", "Forerunner 165"] },
  { aliases: ["edge", "אדג׳", "אדג'", "מחשב אופניים"], name: "Edge 540", from: 4, searches: "מחשב אופניים · edge · gps לאופניים", preview: ["Edge 540", "Edge 1050", "Edge 840"] },
  { aliases: ["lily", "לילי"], name: "Lily 2", from: 6, searches: "שעון לנשים · שעון אלגנטי", preview: ["Lily 2", "Venu 3S", "vívomove Trend"] },
  { aliases: ["descent", "דיסנט", "צלילה"], name: "Descent Mk3", from: 3, searches: "שעון לצלילה · descent · מחשב צלילה", preview: ["Descent Mk3", "Descent G2", "Descent Mk3i"] },
];

function quotedQuery(question) {
  const m = question.match(/[״"“]([^״"”]+)[״"”]/);
  return m ? m[1].trim() : null;
}

// Best-effort product name from a free-form command, for products we don't know.
function guessProductName(question) {
  let t = question;
  PROMOTE_VERBS.forEach(v => { t = t.replace(new RegExp(v, "i"), " "); });
  t = t.replace(/[״"“”][^״"”]*[״"”]/g, " ").replace(/בחיפוש.*$/, " ")
    .replace(/(^|\s)(את|בבקשה|לי|קצת|למעלה|לראש|החדשים|החדש|החדשה)(?=\s|$)/g, " ").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
  return t || "המוצר";
}

export function buildPromoteReply(question) {
  const q = question.toLowerCase();
  if (!PROMOTE_VERBS.some(v => q.includes(v))) return null;
  const target = quotedQuery(question);
  const p = PROMOTABLE.find(x => x.aliases.some(a => q.includes(a.toLowerCase())));
  const title = PIN_VERBS.some(v => q.includes(v)) ? "נעיצת מוצר" : "קידום מוצרים";

  if (p?.intro) {
    const details = target ? p.details.map(([k, v]) => (k === "חיפושים" ? [k, target] : [k, v])) : p.details;
    return {
      blocks: [
        { type: "text", text: p.intro },
        { type: "action", actionType: "pin", title, details, preview: p.preview,
          effect: p.effect && { kind: "pin", ids: p.effect.ids, query: target || p.effect.query } },
        ...(p.outro ? [{ type: "text", text: p.outro }] : []),
      ],
    };
  }

  const name = p?.name || guessProductName(question);
  const from = p?.from ?? 7;
  return {
    blocks: [
      { type: "text", text: `מצאתי את **${name}** בקטלוג. כרגע הוא מופיע בממוצע **במקום ${from}** בחיפושים הרלוונטיים. הכנתי קידום:` },
      {
        type: "action",
        actionType: "pin",
        title,
        details: [
          ["מוצר", name],
          ["חיפושים", target || p?.searches || "כל החיפושים הרלוונטיים (זוהו אוטומטית)"],
          ["מיקום", `מקום ${from} ← מקום 1 עד 2`],
          ["משך", "14 יום, ואז בדיקה אוטומטית"],
        ],
        preview: p?.preview || [name, "תוצאה 2", "תוצאה 3"],
      },
    ],
  };
}
