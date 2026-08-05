import { blogArticles } from './blog/data';
import { getAllCaseStudySlugs } from './lib/case-studies';
import { getAllLearnSlugs } from './lib/learn-content';
import { getAllGlossarySlugs } from './lib/glossary-content';
import { getBuiltToolSlugs } from './lib/tools-content';
import { getAllResearchSlugs } from './lib/research-content';

const SITE_URL = 'https://www.semantix.co.il';

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/search-saver', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/search-discovery', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/semantix-brain', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/upsell-ecosystem', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/case-studies', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/glossary', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tools', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/research', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap() {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogEntries = blogArticles.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const caseStudyEntries = getAllCaseStudySlugs().map((slug) => ({
    url: `${SITE_URL}/case-studies/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const learnEntries = getAllLearnSlugs().map((slug) => ({
    url: `${SITE_URL}/learn/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const glossaryEntries = getAllGlossarySlugs().map((slug) => ({
    url: `${SITE_URL}/glossary/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const toolEntries = getBuiltToolSlugs().map((slug) => ({
    url: `${SITE_URL}/tools/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const researchEntries = getAllResearchSlugs().map((slug) => ({
    url: `${SITE_URL}/research/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...blogEntries,
    ...caseStudyEntries,
    ...learnEntries,
    ...glossaryEntries,
    ...toolEntries,
    ...researchEntries,
  ];
}
