/**
 * Registry of free interactive tools — see the master plan's Phase 10.
 * `status: 'built'` tools get a real link from the hub; everything else
 * shows as "Coming soon" so the hub never links to a page that doesn't exist.
 */

export const TOOLS = [
  {
    slug: 'zero-result-calculator',
    name: 'מחשבון אפס תוצאות',
    description:
      'העריכו כמה הכנסה חודשית נמצאת בסיכון מחיפושים שמחזירים אפס מוצרים, לפי נתוני התעבורה וההמרה שלכם.',
    relatedDomains: ['zero-result-searches', 'ecommerce-conversion'],
    status: 'built',
  },
  {
    slug: 'search-roi-calculator',
    name: 'מחשבון ROI לחיפוש',
    description: 'חשבו את השפעת ההכנסות משיפור החיפוש בכלל — לא רק מהתאוששות מאפס תוצאות.',
    relatedDomains: ['ecommerce-conversion', 'search-analytics'],
    status: 'planned',
  },
  {
    slug: 'search-maturity-assessment',
    name: 'הערכת בשלות חיפוש',
    description: 'הערכה עצמית קצרה שממקמת את החנות שלכם על עקומת בשלות חיפוש.',
    relatedDomains: ['ai-search', 'search-intelligence'],
    status: 'planned',
  },
  {
    slug: 'search-health-score',
    name: 'ציון בריאות חיפוש',
    description: 'אבחון מדורג של חיפוש החנות, על בסיס חידון קצר.',
    relatedDomains: ['search-quality', 'search-analytics'],
    status: 'planned',
  },
];

export function getTool(slug) {
  return TOOLS.find((tool) => tool.slug === slug) || null;
}

export function getBuiltToolSlugs() {
  return TOOLS.filter((tool) => tool.status === 'built').map((tool) => tool.slug);
}
