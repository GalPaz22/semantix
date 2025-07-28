/**
 * Utility functions for Shopify authentication and API requests
 */

/**
 * Get the session token from the window object
 * @returns {string|null} The session token or null if not available
 */
export function getSessionToken() {
  if (typeof window !== 'undefined' && window.sessionToken) {
    return window.sessionToken;
  }
  return null;
}

/**
 * Make an authenticated API request using the session token
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The API response
 */
export async function authenticatedFetch(url, options = {}) {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    throw new Error('No session token available');
  }
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

/**
 * Check if the app is running in an embedded Shopify context
 * @returns {boolean} True if the app is embedded in Shopify
 */
export function isShopifyEmbedded() {
  if (typeof window === 'undefined') return false;
  return window.shopify && window.shopify.config && window.shopify.config.host;
}

/**
 * Redirect to Shopify auth if not authenticated
 * @param {string} authUrl - The authentication URL
 */
export function redirectToShopifyAuth(authUrl) {
  if (typeof window !== 'undefined') {
    window.location.href = authUrl;
  }
} 