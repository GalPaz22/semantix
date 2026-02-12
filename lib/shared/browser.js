/**
 * Shared browser/image utilities used across image-processing modules.
 * Consolidates puppeteer browser management and image fetching.
 */
import puppeteer from 'puppeteer';

/** Shared browser instance for image fetching */
let sharedBrowser = null;

/**
 * Get or create a shared Puppeteer browser instance.
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return sharedBrowser;
}

/**
 * Close the shared browser instance. Call this when processing is complete.
 */
export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}

/**
 * Fetch an image using Puppeteer (stealth mode with proper headers/cookies).
 * @param {string} imageUrl 
 * @returns {Promise<{ data: string, mimeType: string } | null>}
 */
export async function fetchImageWithPuppeteer(imageUrl) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    const origin = new URL(imageUrl).origin;
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Visit origin first for cookies
    await page.goto(origin, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    
    await page.setExtraHTTPHeaders({
      'Referer': origin + '/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    });

    const response = await page.goto(imageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    if (!response || !response.ok()) {
      // Internal fetch fallback
      const base64Data = await page.evaluate(async (url) => {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) { return null; }
      }, imageUrl);

      if (base64Data && base64Data.includes('base64,')) {
        const parts = base64Data.split(',');
        return { data: parts[1], mimeType: parts[0].match(/:(.*?);/)[1] };
      }
      return null;
    }
    
    const buffer = await response.buffer();
    return { data: buffer.toString('base64'), mimeType: response.headers()['content-type'] || 'image/jpeg' };
  } catch (error) {
    console.warn(`❌ Puppeteer error for ${imageUrl}:`, error.message);
    return null;
  } finally {
    if (page) await page.close();
  }
}

/**
 * Fetch an image as base64 — tries native fetch first, falls back to Puppeteer.
 * @param {string} imageUrl 
 * @returns {Promise<{ data: string, mimeType: string } | null>}
 */
export async function fetchImageAsBase64(imageUrl) {
  try {
    // Try native fetch first (fastest)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/*'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 100) {
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return { data: buffer.toString('base64'), mimeType };
      }
    }
  } catch (e) {
    // Silently fall through to Puppeteer
  }

  // Fallback to Puppeteer for protected images
  try {
    return await fetchImageWithPuppeteer(imageUrl);
  } catch (error) {
    console.warn(`❌ Failed to fetch image: ${imageUrl}`, error.message);
    return null;
  }
}

