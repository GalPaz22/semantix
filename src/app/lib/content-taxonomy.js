/**
 * Single source of truth for the Learning Center knowledge graph (see the
 * master plan, Phase 3 "Knowledge Graph & Topic Clusters"). Every content
 * type (blog posts, case studies, and later /learn, /glossary, /research,
 * /tools pages) tags itself with one or more of these domain slugs via a
 * `domains: []` field, so relationships between content can be derived from
 * data instead of hand-maintained per page.
 */

export const LEARN_SUPER_CATEGORIES = [
  {
    slug: 'search-fundamentals',
    name: 'יסודות החיפוש',
    domains: ['ecommerce-search', 'search-intent', 'search-relevance', 'product-discovery', 'ecommerce-ux'],
  },
  {
    slug: 'ai-and-technology',
    name: 'AI וטכנולוגיה',
    domains: ['ai-search', 'search-infrastructure', 'catalog-intelligence'],
  },
  {
    slug: 'optimization',
    name: 'אופטימיזציה',
    domains: ['search-quality', 'ranking-optimization', 'merchandising', 'personalization'],
  },
  {
    slug: 'measurement-and-recovery',
    name: 'מדידה והתאוששות',
    domains: [
      'search-analytics',
      'search-intelligence',
      'zero-result-searches',
      'search-recovery',
      'ecommerce-conversion',
    ],
  },
];

const ALL_SUPER_CATEGORY_DOMAIN_SLUGS = new Set(
  LEARN_SUPER_CATEGORIES.flatMap((category) => category.domains)
);

export const DOMAINS = [
  {
    slug: 'ecommerce-search',
    name: 'חיפוש באיקומרס',
    description: 'מהו חיפוש באתר ולמה הוא חשוב לחנויות איקומרס.',
    relatedDomains: ['search-relevance', 'search-infrastructure'],
  },
  {
    slug: 'zero-result-searches',
    name: 'חיפושים ללא תוצאות',
    description: 'חיפושים שמחזירים כלום, למה זה קורה ומה זה עולה.',
    relatedDomains: ['search-recovery', 'search-analytics', 'ecommerce-conversion'],
    relatedProduct: '/search-saver',
  },
  {
    slug: 'search-recovery',
    name: 'התאוששות חיפוש',
    description: 'טקטיקות לתיקון חיפושים שנכשלו: שכתוב, מילים נרדפות, נתיבי גיבוי.',
    relatedDomains: ['zero-result-searches', 'ai-search'],
    relatedProduct: '/search-saver',
  },
  {
    slug: 'product-discovery',
    name: 'גילוי מוצרים',
    description: 'איך קונים מוצאים מוצרים דרך חיפוש, גלישה והמלצות.',
    relatedDomains: ['merchandising', 'personalization', 'ecommerce-ux'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'ai-search',
    name: 'חיפוש AI',
    description: 'חיפוש סמנטי, היברידי ומונע LLM לאיקומרס.',
    relatedDomains: ['search-infrastructure', 'search-relevance'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'search-intelligence',
    name: 'בינת חיפוש',
    description: 'שכבת האנליטיקס והתובנות מעל התנהגות חיפוש.',
    relatedDomains: ['search-analytics', 'search-quality'],
    relatedProduct: '/semantix-brain',
  },
  {
    slug: 'search-analytics',
    name: 'אנליטיקס חיפוש',
    description: 'מדידת ביצועי חיפוש: CTR, המרה, שיעור אפס תוצאות.',
    relatedDomains: ['search-intelligence', 'ecommerce-conversion'],
    relatedProduct: '/semantix-brain',
  },
  {
    slug: 'search-quality',
    name: 'איכות חיפוש',
    description: 'כוונון רלוונטיות והערכה לתוצאות חיפוש.',
    relatedDomains: ['search-relevance', 'ranking-optimization'],
  },
  {
    slug: 'search-intent',
    name: 'כוונת חיפוש',
    description: 'להבין מה קונים מתכוונים, לא רק מה הם מקלידים.',
    relatedDomains: ['ai-search', 'search-quality'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'search-relevance',
    name: 'רלוונטיות חיפוש',
    description: 'שכבת הניקוד וההתאמה שמדרגת תוצאות חיפוש.',
    relatedDomains: ['ai-search', 'ranking-optimization'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'search-infrastructure',
    name: 'תשתית חיפוש',
    description: 'ארכיטקטורת מנוע חיפוש, אינדוקס והרחבה לקטלוגים גדולים.',
    relatedDomains: ['ai-search'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'merchandising',
    name: 'מרצ׳נדייזינג',
    description: 'שליטה ידנית ומבוססת כללים על תוצאות חיפוש וגלישה.',
    relatedDomains: ['personalization', 'ranking-optimization'],
    relatedProduct: '/upsell-ecosystem',
  },
  {
    slug: 'personalization',
    name: 'פרסונליזציה',
    description: 'דירוג לכל קונה על בסיס התנהגות ואותות רכישה.',
    relatedDomains: ['merchandising', 'catalog-intelligence'],
    relatedProduct: '/upsell-ecosystem',
  },
  {
    slug: 'ranking-optimization',
    name: 'אופטימיזציית דירוג',
    description: 'איך אותות דירוג משתלבים, ואיך לבדוק שינויים בבטחה.',
    relatedDomains: ['search-quality', 'merchandising', 'personalization'],
  },
  {
    slug: 'catalog-intelligence',
    name: 'בינת קטלוג',
    description: 'איכות נתוני מוצר כקלט לחיפוש ולגילוי.',
    relatedDomains: ['ai-search', 'product-discovery'],
    relatedProduct: '/search-discovery',
  },
  {
    slug: 'ecommerce-ux',
    name: 'UX באיקומרס',
    description: 'חוויית החנות סביב החיפוש: מיקום, מובייל, חיכוך.',
    relatedDomains: ['product-discovery', 'ecommerce-conversion'],
  },
  {
    slug: 'ecommerce-conversion',
    name: 'המרה באיקומרס',
    description: 'ההשפעה העסקית של חיפוש: שיעור המרה, ROI, הכנסות שהוחזרו.',
    relatedDomains: ['zero-result-searches', 'search-analytics'],
  },
];

const DOMAIN_BY_SLUG = new Map(DOMAINS.map((domain) => [domain.slug, domain]));

const uncategorizedDomains = DOMAINS.filter((domain) => !ALL_SUPER_CATEGORY_DOMAIN_SLUGS.has(domain.slug));
if (uncategorizedDomains.length > 0) {
  console.warn(
    `[content-taxonomy] Domains missing from LEARN_SUPER_CATEGORIES (won't appear on /learn hub): ${uncategorizedDomains
      .map((d) => d.slug)
      .join(', ')}`
  );
}

export function getDomain(slug) {
  return DOMAIN_BY_SLUG.get(slug) || null;
}

export function getDomainsForSlugs(slugs = []) {
  return slugs.map(getDomain).filter(Boolean);
}
