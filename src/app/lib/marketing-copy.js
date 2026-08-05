export const PRIMARY_CTA = 'דברו איתנו';
export const PRIMARY_CTA_HREF = '/contact';
export const CTA_MICROCOPY = 'נראה לכם מה Search Saver יכול להחזיר בחנות שלכם.';

export const DASHBOARD_METRICS = [
  { value: '40,195', label: 'חיפושים שהוחזרו', note: 'חיפושים בלי תוצאות שהוחזרו במקום.' },
  { value: '₪40,380', label: 'הכנסות שהוחזרו', note: 'הכנסות שיוחסו לביקורים בלי תוצאות שהוחזרו.' },
  { value: '32%', label: 'שיעור החזרה', note: 'חיפושים בלי תוצאות שהוחזרו בהצלחה.' },
];

export const METRICS_ATTRIBUTION = 'מפריסת Search Saver חיה';

// Canonical product taxonomy — Semantix has exactly two products. Everything
// else (analytics, boosting, personalization) is a capability inside Semantix
// Search, not Search Saver. Search Saver's only job is no-results recovery.
export const PRODUCTS = [
  {
    name: 'Search Saver',
    href: '/search-saver',
    tier: 'entry',
    tierLabel: 'מתחילים כאן',
    tagline: 'מתחבר מעל החיפוש שכבר רץ בחנות.',
    description:
      'שכבה קלה שיושבת מעל החיפוש הקיים ומחזירה חיפושים בלי תוצאות בזמן אמת — כשלקוח מגיע לאפס מוצרים, Search Saver מחזיר התאמות רלוונטיות באותו עמוד תוצאות.',
  },
  {
    name: 'Semantix Search',
    href: '/search-discovery',
    tier: 'upgrade',
    tierLabel: 'שדרוג',
    tagline: 'מנוע החיפוש ההיברידי הרב־שכבתי המלא.',
    description:
      'חיפוש היברידי רב־שכבתי ורב־לשוני שמבין שאילתות מורכבות וסטנדרטיות — עם קידום, פרופילים ופרסונליזציה, כדי שכל קונה יגיע לתוצאה הנכונה.',
  },
];
