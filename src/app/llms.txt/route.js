import { LEARN_ARTICLES } from '../lib/learn-content';
import { GLOSSARY_TERMS } from '../lib/glossary-content';
import { TOOLS } from '../lib/tools-content';
import { RESEARCH_ITEMS } from '../lib/research-content';
import { CASE_STUDIES } from '../lib/case-studies';
import { blogArticles } from '../blog/data';

const SITE_URL = 'https://www.semantix.co.il';

function section(heading, lines) {
  if (!lines.length) return '';
  return `## ${heading}\n\n${lines.join('\n')}\n`;
}

function link(title, path, description) {
  const url = `${SITE_URL}${path}`;
  return description ? `- [${title}](${url}): ${description}` : `- [${title}](${url})`;
}

export async function GET() {
  const productLinks = [
    link('Search Saver', '/search-saver', 'מחזיר חיפושים ללא תוצאות באותו דף תוצאות, בלי להחליף את ממשק החנות.'),
    link('Semantix Search', '/search-discovery', 'מנוע חיפוש היברידי לחנות: מילות מפתח + סמנטיקה, כוונה ופרסונליזציה.'),
    link('Semantix Brain', '/semantix-brain', 'אנליטיקה ותובנות מחיפוש בחנות — שאילתות, אפס תוצאות והמרה.'),
    link('Upsell Ecosystem', '/upsell-ecosystem', 'פרסונליזציה ובוסטינג מעל תוצאות החיפוש והגילוי.'),
    link('מחירים', '/pricing', 'תוכניות ומחירים למוצרי Semantix.'),
  ];

  const learnLinks = LEARN_ARTICLES.map((a) =>
    link(a.title, `/learn/${a.slug}`, a.metaDescription)
  );

  const glossaryLinks = GLOSSARY_TERMS.map((t) =>
    link(t.term, `/glossary/${t.slug}`, t.shortDefinition)
  );

  const researchLinks = RESEARCH_ITEMS.map((r) =>
    link(r.title, `/research/${r.slug}`, r.metaDescription)
  );

  const toolLinks = TOOLS.filter((t) => t.status === 'built').map((t) =>
    link(t.name, `/tools/${t.slug}`, t.description)
  );

  const caseStudyLinks = CASE_STUDIES.map((c) =>
    link(`פרויקט ${c.name}`, `/case-studies/${c.slug}`, c.blurb)
  );

  const blogLinks = blogArticles.map((b) =>
    link(b.title, `/blog/${b.slug}`, b.excerpt)
  );

  const secondary = [link('אודות', '/about'), link('צור קשר', '/contact')];

  const body = [
    '# Semantix',
    '',
    '> Semantix בונה חיפוש לאי־קומרס שמוכר. Search Saver מחזיר חיפושים ללא תוצאות, ו־Semantix Search מפעיל חיפוש היברידי וסמנטי בחנות. הקובץ הזה מפרט את דפי האתר לעוזרי AI ולסורקים, לפי מדור.',
    '',
    section('מוצרים', productLinks),
    section('ללמוד (מדריכי ליבה)', learnLinks),
    section('מילון', glossaryLinks),
    section('מחקר', researchLinks),
    section('כלים', toolLinks),
    section('פרויקטים', caseStudyLinks),
    section('בלוג', blogLinks),
    section('אחר', secondary),
  ]
    .filter(Boolean)
    .join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
