import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';

// Initialize Google AI if you have the API key
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ai = GOOGLE_AI_API_KEY && GOOGLE_AI_API_KEY !== "YOUR_GOOGLE_AI_KEY" 
  ? new GoogleGenAI({apiKey: GOOGLE_AI_API_KEY})
  : null;

let browser = null;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

async function findSearchBarSelectors(url) {
    const browser = await initBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const pageInfo = await page.evaluate(() => {
        const commonSelectors = [
          'input[type="search"]',
          'form input[type="text"]',
          'input[name*="search" i]',
          'input[id*="search" i]',
          'input[class*="search" i]',
          'input[placeholder*="search" i]',
          'input[aria-label*="search" i]',
          '.search-input',
          '#search',
          '.search',
        ];
        const potential = [];
        // Collect elements using common selectors
        commonSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => potential.push(el));
        });
        // Collect inputs from forms that contain the word "search"
        document.querySelectorAll('form').forEach(form => {
          const html = form.outerHTML.toLowerCase();
          if (html.includes('search')) {
            form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])')
              .forEach(i => potential.push(i));
          }
        });
        
        const serialize = el => {
          let specific = '';
          if (el.id) specific = `#${el.id}`;
          else if (el.className) specific = `.${el.className.split(/\s+/).join('.')}`;
          else {
            const path = [];
            let cur = el;
            while (cur && cur !== document.body) {
              let seg = cur.tagName.toLowerCase();
              if (cur.id) { seg += `#${cur.id}`; path.unshift(seg); break; }
              if (cur.className) seg += `.${cur.className.split(/\s+/).join('.')}`;
              const sibs = Array.from(cur.parentElement.children)
                .filter(c => c.tagName === cur.tagName);
              if (sibs.length > 1) seg += `:nth-child(${sibs.indexOf(cur) + 1})`;
              path.unshift(seg);
              cur = cur.parentElement;
            }
            specific = path.join(' > ');
          }
          return {
            tagName: el.tagName.toLowerCase(),
            type: el.type || '',
            id: el.id || '',
            className: el.className || '',
            name: el.name || '',
            placeholder: el.placeholder || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
            specificSelector: specific,
            parentForm: el.closest('form') ? {
              action: el.closest('form').action || '',
              method: el.closest('form').method || '',
              id: el.closest('form').id || '',
              className: el.closest('form').className || ''
            } : null
          };
        };
        
        const inputs = potential.map(el => serialize(el));
        return {
          title: document.title,
          url: window.location.href,
          potentialSearchInputs: inputs,
          pageStructure: {
            formCount: document.querySelectorAll('form').length,
            inputCount: document.querySelectorAll('input').length,
            buttonCount: document.querySelectorAll('button').length,
          }
        };
      });
      
      return pageInfo;
    } finally {
      await page.close();
    }
  }

  async function determineOptimalSelector(pageInfo) {
    // Check if Gemini AI is available
    if (!ai) {
      console.warn("Google AI client not initialized - falling back to basic selector detection");
      return "no selector found";
    }

    try {
      const messages = [
        {
          role: 'user',
          parts: [{
            text: `Identify the best CSS selector to target the search bar on the page. I want you to aim for the search container. Answer only with a CSS selector. Do not include any other text or explanation. The input is a JSON object containing the page information. If you cannot find a selector, return "no selector found".

Page Information: ${JSON.stringify(pageInfo)}`
          }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: messages,
      });

      // Handle response structure
      let result;
      if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          result = candidate.content.parts[0].text;
        }
      } else if (response.response && response.response.candidates && Array.isArray(response.response.candidates) && response.response.candidates.length > 0) {
        const candidate = response.response.candidates[0];
        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          result = candidate.content.parts[0].text;
        }
      }

      return result?.trim() || "no selector found";
    } catch (error) {
      console.error('Gemini selector analysis failed:', error);
      return "no selector found";
    }
  }

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const includeSnapshot = searchParams.get("includeSnapshot") === "true";
  if (!url) {
    return new Response(JSON.stringify({ error: 'Valid URL is required (pass url as a query parameter)' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const pageInfo = await findSearchBarSelectors(url);
    const analysis = await determineOptimalSelector(pageInfo);
    return new Response(
      JSON.stringify({ url, analysis, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('GET handler error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { url, includeSnapshot } = body;
  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Valid URL is required (pass url in body)' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const pageInfo = await findSearchBarSelectors(url);
    const analysis = await determineOptimalSelector(pageInfo);
    return new Response(
      JSON.stringify({ url, analysis, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('POST handler error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}