import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../@/lib/auth/options";
import { GoogleGenAI } from '@google/genai';

const adminEmail = "galpaz2210@gmail.com";

/**
 * POST /api/admin/analyze-selectors
 * 
 * Analyzes a WooCommerce site using Puppeteer + Gemini to auto-detect selectors
 * 
 * Body:
 * {
 *   "url": "https://example.com/search/?s=test"
 * }
 */
export async function POST(request) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url, platform } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const detectedPlatform = platform || 'woocommerce';
    console.log(`🔍 Analyzing ${detectedPlatform} site: ${url}`);

    // Check if Gemini API key exists
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({ 
        error: "Gemini API key not configured",
        suggestion: "Add GOOGLE_AI_API_KEY to your .env.local file"
      }, { status: 500 });
    }

    // Initialize Google AI client (same as processWoo.js)
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

    // Dynamic import of Puppeteer (server-side only)
    const puppeteer = await import('puppeteer');

    // Launch Puppeteer
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      console.log('✓ Page loaded successfully');

      // Extract HTML structure for analysis
      const htmlStructure = await page.evaluate(() => {
        // Get product grid container
        const possibleGrids = [
          document.querySelector('ul.products'),
          document.querySelector('.products'),
          document.querySelector('#product-grid'),
          document.querySelector('.wc-block-grid__products'),
          document.querySelector('[class*="product-grid"]'),
          document.querySelector('[class*="products-container"]')
        ].filter(el => el !== null);

        const grid = possibleGrids[0];
        
        if (!grid) {
          return { error: 'No product grid found' };
        }

        // Get product cards
        const cards = Array.from(grid.querySelectorAll('li, [class*="product-card"], [class*="product-item"]'));
        
        if (cards.length === 0) {
          return { error: 'No product cards found' };
        }

        const firstCard = cards[0];

        // Analyze first card structure
        const getSelector = (element) => {
          if (!element) return null;
          const classes = Array.from(element.classList).join('.');
          const tag = element.tagName.toLowerCase();
          return classes ? `${tag}.${classes}` : tag;
        };

        // Find elements within card
        const title = firstCard.querySelector('h2, h3, .woocommerce-loop-product__title, [class*="product-title"], [class*="product__title"]');
        const price = firstCard.querySelector('.price, [class*="product-price"], [class*="price"]');
        const image = firstCard.querySelector('img');
        const link = firstCard.querySelector('a');
        const addToCart = firstCard.querySelector('.add_to_cart_button, [class*="add-to-cart"]');
        const badge = firstCard.querySelector('.onsale, .out-of-stock, [class*="badge"]');

        return {
          gridSelector: getSelector(grid),
          gridTag: grid.tagName.toLowerCase(),
          cardSelector: getSelector(firstCard),
          cardCount: cards.length,
          elements: {
            title: title ? {
              selector: getSelector(title),
              text: title.textContent?.trim().substring(0, 50)
            } : null,
            price: price ? {
              selector: getSelector(price),
              text: price.textContent?.trim()
            } : null,
            image: image ? {
              selector: getSelector(image),
              src: image.src,
              alt: image.alt
            } : null,
            link: link ? {
              selector: getSelector(link),
              href: link.href
            } : null,
            addToCart: addToCart ? {
              selector: getSelector(addToCart)
            } : null,
            badge: badge ? {
              selector: getSelector(badge)
            } : null
          },
          html: firstCard.outerHTML.substring(0, 2000) // First 2000 chars
        };
      });

      console.log('✓ HTML structure extracted:', htmlStructure);

      if (htmlStructure.error) {
        await browser.close();
        return NextResponse.json({ 
          error: htmlStructure.error,
          suggestion: 'Make sure the URL points to a WooCommerce search results page with products'
        }, { status: 400 });
      }

      // Use Gemini to analyze and suggest selectors
      const platformHints = detectedPlatform === 'shopify' 
        ? 'This is a Shopify store. Look for Shopify-specific classes like .collection-grid, .grid__item, .product-card, etc.'
        : 'This is a WooCommerce store. Look for WooCommerce-specific classes like .products, li.product, .woocommerce-loop-product__title, etc.';

      const prompt = `You are a CSS selector expert analyzing a ${detectedPlatform.toUpperCase()} product page structure.

${platformHints}

Analyze this HTML structure and generate optimal CSS selectors:

${JSON.stringify(htmlStructure, null, 2)}

Return a valid JSON object with this exact structure (no markdown, no extra text):
{
  "domains": [],
  "queryParams": ["s", "q"],
  "selectors": {
    "resultsGrid": ["selector1", "selector2"],
    "productCard": ["selector"],
    "noResults": [".woocommerce-info", ".no-results"],
    "pageTitle": ["h1", ".page-title"]
  },
  "nativeCard": {
    "cloneFromSelector": "grid-selector card-selector",
    "templateHtml": null,
    "map": {
      "titleSelector": ".title-selector",
      "priceSelector": ".price-selector",
      "imageSelector": "img",
      "linkSelector": "a"
    },
    "cleanupSelectors": [".badge-selectors"],
    "disableAddToCart": true
  },
  "behavior": {
    "injectPosition": "prepend",
    "injectCount": 6,
    "fadeMs": 260,
    "loader": true
  },
  "features": {
    "rerankBoost": false,
    "injectIntoGrid": true,
    "zeroReplace": true
  },
  "texts": {
    "loader": "טוען תוצאות חכמות"
  },
  "debug": {
    "enabled": false
  }
}

Rules:
1. Use the most specific selectors found in the analysis
2. Provide fallback selectors in arrays (most specific first)
3. For cloneFromSelector, combine grid and card selectors (e.g., "ul.products li.product")
4. Include common WooCommerce badges in cleanupSelectors (.onsale, .out-of-stock)
5. Return ONLY the JSON object, no other text
`;

      // Call Gemini API using GoogleGenAI SDK (same as processWoo.js)
      console.log('🔍 Making Gemini API call...');
      
      const messages = [
        {
          role: "user",
          parts: [{
            text: prompt
          }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      console.log('✅ Gemini API response received');
      console.log('🔍 Response structure:', JSON.stringify(response, null, 2));

      if (!response) {
        throw new Error("Gemini API returned null/undefined response");
      }

      // Extract text from response (same as processWoo.js)
      let text;
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log("✅ Using direct candidates structure");
        text = response.candidates[0].content.parts[0].text;
      } else if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log("✅ Using legacy response.response structure");
        text = response.response.candidates[0].content.parts[0].text;
      }

      if (!text) {
        console.error('❌ No text in Gemini response');
        await browser.close();
        return NextResponse.json({ 
          error: 'Invalid response structure from Gemini API - no valid candidates found',
          details: response 
        }, { status: 500 });
      }
      
      console.log('🤖 Gemini raw text response:', text.substring(0, 500));

      // Parse the JSON from Gemini
      let siteConfig;
      try {
        // With responseMimeType: 'application/json', response should be clean JSON
        // But still handle markdown code blocks just in case
        let jsonText = text.trim();
        
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        // Try to parse
        siteConfig = JSON.parse(jsonText);
        console.log('✅ Successfully parsed Gemini response');
        
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response:', parseError.message);
        console.error('Raw text:', text);
        await browser.close();
        return NextResponse.json({ 
          error: 'Failed to parse AI response',
          details: {
            errorMessage: parseError.message,
            rawResponse: text.substring(0, 500)
          }
        }, { status: 500 });
      }

      await browser.close();

      console.log('✅ Successfully analyzed site and generated config');

      return NextResponse.json({
        success: true,
        siteConfig,
        analysis: {
          url,
          productsFound: htmlStructure.cardCount,
          detected: {
            grid: htmlStructure.gridSelector,
            card: htmlStructure.cardSelector,
            hasTitle: !!htmlStructure.elements.title,
            hasPrice: !!htmlStructure.elements.price,
            hasImage: !!htmlStructure.elements.image
          }
        }
      });

    } catch (pageError) {
      await browser.close();
      console.error('Page error:', pageError);
      return NextResponse.json({ 
        error: 'Failed to load page',
        details: pageError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in analyze-selectors:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze site',
      details: error.message 
    }, { status: 500 });
  }
}

