/**
 * Shopify App Configuration
 * 
 * This file contains the configuration for the Shopify public app.
 * It includes API keys, scopes, and other settings needed for the app.
 */

// App credentials - these should be set in environment variables
export const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '4dc0c8eb702329c406a13a5967ce8dce';
export const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// App settings
export const APP_NAME = 'Semantix AI Search';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://semantix.ai';

// Required scopes for the app
export const SCOPES = [
  'read_products',
  'write_products',
  'read_themes',
  'write_themes',
  'read_content',
  'write_content'
];

// Webhook topics to subscribe to
export const WEBHOOK_TOPICS = [
  'products/create',
  'products/update',
  'products/delete',
  'collections/create',
  'collections/update',
  'collections/delete',
  'customers/data_request',
  'customers/redact',
  'shop/redact'
];

// URLs
export const AUTH_CALLBACK_URL = '/api/shopify-auth-callback';
export const INSTALL_URL = '/install-shopify-app';

/**
 * Generate the OAuth URL for a Shopify store
 * @param {string} shop - The shop domain (e.g. my-store.myshopify.com)
 * @param {string} state - A random state string for CSRF protection
 * @param {string} redirectUri - The redirect URI after authorization
 * @returns {string} The OAuth URL
 */
export function generateAuthUrl(shop, state, redirectUri) {
  const formattedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  const formattedRedirectUri = redirectUri || `${APP_URL}${AUTH_CALLBACK_URL}`;
  
  const url = new URL(`https://${formattedShop}/admin/oauth/authorize`);
  url.searchParams.append('client_id', SHOPIFY_API_KEY);
  url.searchParams.append('scope', SCOPES.join(','));
  url.searchParams.append('redirect_uri', formattedRedirectUri);
  url.searchParams.append('state', state);
  
  return url.toString();
}

/**
 * Exchange the authorization code for an access token
 * @param {string} shop - The shop domain
 * @param {string} code - The authorization code
 * @returns {Promise<Object>} The response containing the access token
 */
export async function exchangeCodeForToken(shop, code) {
  const formattedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  
  const response = await fetch(`https://${formattedShop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Make an authenticated API call to the Shopify Admin API
 * @param {string} shop - The shop domain
 * @param {string} accessToken - The access token
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The API response
 */
export async function shopifyAdminApiRequest(shop, accessToken, endpoint, options = {}) {
  const formattedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  const apiVersion = '2023-10'; // Update this to the latest stable version
  
  const url = `https://${formattedShop}/admin/api/${apiVersion}/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`Shopify API request failed: ${response.statusText}`);
  }
  
  return response.json();
} 