import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '/src/app/api/auth/[...nextauth]/route';
import { parse } from 'node-html-parser';
import { callGemini } from '/lib/shared/ai.js';
import clientPromise from '/lib/mongodb.js';

const adminEmail = 'galpaz2210@gmail.com';
const MAX_INTERNAL_PAGES = 8;

function uniq(values, limit = 80) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    const key = clean.toLowerCase();
    if (!clean || clean.length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= limit) break;
  }
  return result;
}

function asArray(value, limit = 40) {
  return uniq(Array.isArray(value) ? value : [], limit);
}

function cleanJsonText(text) {
  let jsonText = String(text || '').trim();
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonText = codeBlockMatch[1].trim();
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonText = jsonMatch[0];
  return jsonText;
}

function normalizeUrl(input) {
  const url = new URL(String(input || '').trim());
  url.hash = '';
  return url;
}

async function findUserByDbName(dbName) {
  const client = await clientPromise;
  const users = client.db('users').collection('users');
  return users.findOne({
    $or: [
      { 'credentials.dbName': dbName.trim() },
      { dbName: dbName.trim() }
    ]
  });
}

function resolveStoreFromUser(user, platformOverride) {
  const credentials = user.credentials || {};
  const platform = String(platformOverride || user.platform || credentials.platform || '').toLowerCase();

  if (platform === 'woocommerce') {
    const wooUrl = credentials.wooUrl?.trim();
    if (!wooUrl) return { error: 'WooCommerce URL missing on user credentials' };
    return { platform: 'woocommerce', url: wooUrl, user };
  }

  if (platform === 'shopify') {
    const rawDomain = user.shopifyShop || credentials.shopifyDomain;
    if (!rawDomain) return { error: 'Shopify domain missing on user credentials' };
    const domain = String(rawDomain).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return { platform: 'shopify', url: `https://${domain}`, user };
  }

  return { error: `Unsupported or missing platform on user (got: ${platform || 'none'})` };
}

function resolveInternalLink(baseUrl, href) {
  try {
    const url = new URL(href, baseUrl);
    url.hash = '';
    if (url.hostname !== baseUrl.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

function scoreCategoryLink(link) {
  const haystack = `${link.href} ${link.className} ${link.id} ${link.text}`.toLowerCase();
  let score = 0;
  if (haystack.includes('collection')) score += 4;
  if (haystack.includes('category') || haystack.includes('categories')) score += 4;
  if (haystack.includes('product-category')) score += 4;
  if (haystack.includes('/shop')) score += 3;
  if (haystack.includes('/collections/')) score += 3;
  if (haystack.includes('/product-category/')) score += 3;
  if (haystack.includes('filter') || haystack.includes('facet')) score += 2;
  if (haystack.includes('menu') || haystack.includes('nav')) score += 1;
  if (link.text && link.text.length <= 40) score += 1;
  if (haystack.includes('cart') || haystack.includes('account') || haystack.includes('login')) score -= 5;
  return score;
}

function extractSignalsFromHtml(html, pageUrl) {
  const root = parse(html);
  const title = root.querySelector('title')?.text?.replace(/\s+/g, ' ').trim() || '';
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  const headings = root
    .querySelectorAll('h1, h2, h3')
    .map(node => node.text?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const breadcrumbs = root
    .querySelectorAll('[class*="breadcrumb"], [id*="breadcrumb"], nav[aria-label*="breadcrumb" i] a, nav[aria-label*="breadcrumb" i] span')
    .map(node => node.text?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const filters = root
    .querySelectorAll('label, option, button, input[placeholder], [class*="filter"], [class*="facet"], [class*="swatch"], [class*="tag"]')
    .map(node => node.text?.trim() || node.getAttribute('placeholder') || node.getAttribute('value') || node.getAttribute('aria-label') || '')
    .filter(Boolean);

  const rawLinks = root.querySelectorAll('a')
    .map(anchor => ({
      text: anchor.text?.replace(/\s+/g, ' ').trim() || '',
      href: anchor.getAttribute('href') || '',
      className: anchor.getAttribute('class') || '',
      id: anchor.getAttribute('id') || '',
      ariaLabel: anchor.getAttribute('aria-label') || ''
    }))
    .map(link => ({ ...link, text: link.text || link.ariaLabel }))
    .filter(link => link.text && link.href);

  const categoryLinks = rawLinks
    .map(link => {
      const resolved = resolveInternalLink(pageUrl, link.href);
      return resolved ? { ...link, resolvedUrl: resolved.toString(), score: scoreCategoryLink(link) } : null;
    })
    .filter(Boolean)
    .filter(link => link.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    url: pageUrl.toString(),
    title,
    metaDescription,
    headings: uniq(headings, 50),
    breadcrumbs: uniq(breadcrumbs, 50),
    filters: uniq(filters, 120),
    categoryLinks: uniq(categoryLinks.map(link => link.text), 120),
    candidateUrls: uniq(categoryLinks.map(link => link.resolvedUrl), MAX_INTERNAL_PAGES)
  };
}

async function fetchHtmlPage(inputUrl) {
  const response = await fetch(inputUrl.toString(), {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Page fetch failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.text();
}

async function fetchPageSignals(inputUrl) {
  try {
    const html = await fetchHtmlPage(inputUrl);
    const mainPage = extractSignalsFromHtml(html, inputUrl);
    const linkedPages = await Promise.all(
      mainPage.candidateUrls.map(async candidateUrl => {
        try {
          const pageUrl = new URL(candidateUrl);
          const linkedHtml = await fetchHtmlPage(pageUrl);
          const signals = extractSignalsFromHtml(linkedHtml, pageUrl);
          return {
            url: signals.url,
            title: signals.title,
            headings: signals.headings,
            breadcrumbs: signals.breadcrumbs,
            filters: signals.filters,
            categoryLinks: signals.categoryLinks
          };
        } catch (error) {
          return { url: candidateUrl, error: error.message };
        }
      })
    );

    return { mainPage, linkedPages };
  } catch (error) {
    return { error: error.message };
  }
}

function normalizeDiscovery(parsed) {
  const filtersNeeded = Array.isArray(parsed.filtersNeeded)
    ? parsed.filtersNeeded.map(filter => ({
        name: String(filter?.name || '').trim(),
        type: String(filter?.type || '').trim(),
        values: asArray(filter?.values, 30),
        reason: String(filter?.reason || '').trim()
      })).filter(filter => filter.name)
    : [];

  const categories = asArray(parsed.categories, 30);
  const type = asArray(parsed.type || parsed.productTypes || parsed.types, 10);
  const softCategories = asArray(parsed.softCategories, 60);

  return {
    categories,
    type,
    softCategories,
    credentials: { categories, type, softCategories },
    colors: asArray(parsed.colors, 40),
    filtersNeeded,
    notes: String(parsed.notes || '').trim(),
    confidence: parsed.confidence || 'medium'
  };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { url, platform, dbName } = await request.json();
    const cleanDbName = String(dbName || '').trim();
    const cleanUrl = String(url || '').trim();
    let cleanPlatform = String(platform || '').toLowerCase();
    let user = null;
    let resolvedUrl = cleanUrl;

    if (cleanDbName) {
      user = await findUserByDbName(cleanDbName);
      if (user) {
        const resolved = resolveStoreFromUser(user, cleanPlatform || undefined);
        if (!resolved.error) {
          cleanPlatform = resolved.platform;
          resolvedUrl = cleanUrl || resolved.url;
        }
      }
    }

    if (!['shopify', 'woocommerce'].includes(cleanPlatform)) {
      return NextResponse.json({ error: 'platform must be shopify or woocommerce' }, { status: 400 });
    }
    if (!resolvedUrl) {
      return NextResponse.json({ error: 'store URL is required' }, { status: 400 });
    }

    const inputUrl = normalizeUrl(resolvedUrl);

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: 'Gemini API key not configured',
        suggestion: 'Add GOOGLE_AI_API_KEY to your .env.local file'
      }, { status: 500 });
    }

    const pageSignals = await fetchPageSignals(inputUrl);
    if (pageSignals.error) {
      return NextResponse.json({ error: pageSignals.error }, { status: 400 });
    }

    const prompt = `You are building the filter taxonomy for a semantic ecommerce search engine.

Input is a public ${cleanPlatform} store URL and the visible site structure extracted from the site itself.
Use only navigation, menus, category links, collection pages, headings, breadcrumbs, filter labels, facet labels, button text, and metadata.
Do not assume access to a product feed or product API.

Return ONLY valid JSON with this exact shape (field names must match MongoDB credentials):
{
  "categories": [],
  "type": [],
  "softCategories": [],
  "colors": [],
  "filtersNeeded": [
    { "name": "", "type": "category|type|softCategory|color|other", "values": [], "reason": "" }
  ],
  "notes": "",
  "confidence": "high|medium|low"
}

Target distribution (production credentials shape):
- "categories": the main hard filters — usually about 5-12 items from top navigation / departments (e.g. יינות, גבינות, משקאות, מתנות).
- "type": VERY SMALL strict list — usually 0-6 items only (e.g. כשר, מהדרין, גברים, נשים). Never dump product names here.
- "softCategories": the rich semantic layer — usually about 10-25 items (occasions, styles, materials, audience, regions, intents).

Rules:
- "categories" are broad hard departments / product families shown in main navigation. Stable shelf-level groupings only. Put wine types, cheese families, clothing departments HERE — not in "type".
- "type" is STRICT and MINIMAL (ideally 0-6 items, never more than 10).
  - Include ONLY store-wide segmentation axes that apply across many unrelated products.
  - Valid examples: "גברים", "נשים", "ילדים", "כשר", "מהדרין", "חלבי", "בשרי", "פרווה", "טבעוני", "ללא גלוטן" (only if clearly a site-wide filter, not a single category name).
  - Do NOT put product nouns here (no: יין אדום, קברנה, נעליים, שמלה, עגבניות, קפה, מתנה).
  - Do NOT put styles, occasions, materials, brands, collections, or marketing themes here — those belong in "softCategories".
  - If the site has no clear global type axis, return "type": [].
  - When unsure whether something is a type, put it in "categories" or "softCategories" instead — never in "type".
- "softCategories" are use-cases, styles, occasions, materials, audience nuance, regions, grape/varietal themes, gift intent, price tier, season, or other semantic facets — but NOT the strict type axes above.
- "colors" should include only real product colors found or strongly implied.
- Preserve the store language when labels are clearly Hebrew; otherwise use short English labels.
- Prefer concise labels (1-3 words). Avoid duplicates and overly specific product names.
- Use the site structure to infer missing useful filters, but do not invent filters unrelated to the store.
- If the site structure is too thin, return a low confidence value and explain what is missing in notes.

Store URL: ${inputUrl.toString()}
Site signals:
${JSON.stringify(pageSignals, null, 2)}`;

    const resultText = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      thinkingBudget: 0
    });

    if (!resultText) {
      return NextResponse.json({ error: 'Gemini returned no response' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText(resultText));
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to parse Gemini response',
        details: error.message,
        rawResponse: resultText.slice(0, 1000)
      }, { status: 500 });
    }

    const discovery = normalizeDiscovery(parsed);

    return NextResponse.json({
      success: true,
      platform: cleanPlatform,
      url: inputUrl.toString(),
      dbName: cleanDbName || user?.credentials?.dbName || user?.dbName || null,
      userExists: cleanDbName ? Boolean(user) : null,
      userName: user?.name || null,
      pagesAnalyzed: 1 + (pageSignals.linkedPages?.filter(page => !page.error).length || 0),
      pageSignals,
      discovery
    });
  } catch (error) {
    console.error('[discover-client-taxonomy error]', error);
    return NextResponse.json({ error: error.message || 'Failed to discover taxonomy' }, { status: 500 });
  }
}

export const maxDuration = 60;
