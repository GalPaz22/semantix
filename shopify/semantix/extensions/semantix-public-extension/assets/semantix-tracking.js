/**
 * Semantix Client-Side Tracking for Shopify
 * Version: 1.0.0
 * 
 * This script provides event tracking similar to WooCommerce hooks,
 * but implemented client-side for Shopify.
 */

(function() {
  'use strict';

  // ==================== Configuration ====================
  const TRACKING_CONFIG = {
    debug: false,
    queueKey: 'semantix_event_queue',
    searchQueryKey: 'semantix_last_search',
    searchResultsKey: 'semantix_search_results',
    sessionKey: 'semantix_session_id'
  };

  // ==================== Utilities ====================
  function log(...args) {
    if (TRACKING_CONFIG.debug) {
      console.log('%c[Semantix Tracking]', 'color: #ff6600; font-weight: bold;', ...args);
    }
  }

  function getSessionId() {
    return getCookie(TRACKING_CONFIG.sessionKey);
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days = 30) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function getLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }

  function setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      log('Failed to save to localStorage:', e);
    }
  }

  function getLastSearchQuery() {
    // Try to get from localStorage first
    const stored = getLocalStorage(TRACKING_CONFIG.searchQueryKey);
    if (stored && stored.query) {
      return stored.query;
    }

    // Try to get from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || urlParams.get('search');
    if (query) {
      setLocalStorage(TRACKING_CONFIG.searchQueryKey, { query, timestamp: Date.now() });
      return query;
    }

    return '';
  }

  function getSearchResults() {
    const results = getLocalStorage(TRACKING_CONFIG.searchResultsKey);
    return results || [];
  }

  // ==================== API Communication ====================
  
  /**
   * Get the correct endpoint for event type
   */
  function getEndpointForEvent(eventType) {
    const settings = window.SemantixSettings;
    const apiBase = settings.apiBase || 'https://api.semantix-ai.com';
    
    log(`🎯 Getting endpoint for event type: "${eventType}"`);
    log(`📍 API Base: ${apiBase}`);
    log(`📋 Available endpoints:`, settings.endpoints);
    
    // Map event types to endpoints
    const endpointMap = {
      'product_click': settings.endpoints?.productClick || '/product-click',
      'add_to_cart': settings.endpoints?.searchToCart || '/search-to-cart',
      'checkout_initiated': settings.endpoints?.searchToCart || '/search-to-cart',
      'checkout_completed': settings.endpoints?.searchToCart || '/search-to-cart'
    };
    
    const endpoint = endpointMap[eventType] || '/search-to-cart';
    
    // Build full URL
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;
    
    log(`✅ Resolved endpoint: ${fullUrl}`);
    
    return fullUrl;
  }
  
  async function sendTrackingEvent(eventData) {
    console.group(`📤 [Semantix Tracking] Sending ${eventData.event_type}`);
    
    const settings = window.SemantixSettings;
    if (!settings || !settings.apiKey) {
      console.error('❌ Cannot send event: SemantixSettings not configured');
      console.groupEnd();
      return;
    }

    // Get correct endpoint based on event type
    const endpoint = getEndpointForEvent(eventData.event_type);
    
    const payload = {
      document: {
        ...eventData,
        platform: 'shopify',
        timestamp: eventData.timestamp || new Date().toISOString()
      }
    };

    log('📦 Full payload:', payload);
    log('🔑 API Key (first 10 chars):', settings.apiKey.substring(0, 10) + '...');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.apiKey
        },
        body: JSON.stringify(payload)
      });

      log(`📊 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Server error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json().catch(() => null);
      log(`✅ Event sent successfully to ${endpoint}`);
      if (responseData) {
        log('📥 Server response:', responseData);
      }
      
      console.groupEnd();
    } catch (error) {
      console.error(`❌ Failed to send event to ${endpoint}`);
      console.error('Error details:', error);
      console.error('Stack:', error.stack);
      
      // Queue for retry
      log('💾 Queuing event for retry');
      queueEvent(eventData);
      
      console.groupEnd();
    }
  }

  function queueEvent(eventData) {
    const queue = getLocalStorage(TRACKING_CONFIG.queueKey) || [];
    queue.push({
      ...eventData,
      queued_at: Date.now()
    });
    
    // Keep only last 50 events
    if (queue.length > 50) {
      queue.shift();
    }
    
    setLocalStorage(TRACKING_CONFIG.queueKey, queue);
  }

  function processQueue() {
    const queue = getLocalStorage(TRACKING_CONFIG.queueKey) || [];
    if (queue.length === 0) return;

    log('Processing queued events:', queue.length);

    queue.forEach(event => {
      sendTrackingEvent(event);
    });

    // Clear queue
    setLocalStorage(TRACKING_CONFIG.queueKey, []);
  }

  // ==================== Event Tracking ====================

  /**
   * Track Add to Cart
   */
  function trackAddToCart(productData) {
    const eventData = {
      event_type: 'add_to_cart',
      product_id: String(productData.id || productData.variant_id),
      product_name: productData.title || productData.product_title,
      search_query: getLastSearchQuery(),
      session_id: getSessionId(),
      quantity: productData.quantity || 1,
      price: productData.price ? parseFloat(productData.price) / 100 : null, // Shopify stores in cents
      search_results: getSearchResults(),
      variant_id: productData.variant_id,
      variant_title: productData.variant_title
    };

    log('🛒 Add to Cart:', eventData);
    sendTrackingEvent(eventData);
  }

  /**
   * Track Checkout Initiated
   */
  function trackCheckoutInitiated() {
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        const eventData = {
          event_type: 'checkout_initiated',
          search_query: getLastSearchQuery(),
          session_id: getSessionId(),
          cart_total: cart.total_price / 100, // Convert from cents
          cart_count: cart.item_count,
          cart_items: cart.items.map(item => ({
            product_id: String(item.product_id),
            product_name: item.product_title,
            variant_id: String(item.variant_id),
            variant_title: item.variant_title,
            quantity: item.quantity,
            price: item.price / 100
          }))
        };

        log('💳 Checkout Initiated:', eventData);
        sendTrackingEvent(eventData);
      })
      .catch(err => log('Failed to track checkout:', err));
  }

  /**
   * Track Checkout Completed
   * Note: This runs on the thank-you page
   */
  function trackCheckoutCompleted() {
    // Shopify exposes order data on thank-you page
    if (!window.Shopify || !window.Shopify.checkout) {
      log('No checkout data available');
      return;
    }

    const checkout = window.Shopify.checkout;
    
    const eventData = {
      event_type: 'checkout_completed',
      search_query: getLastSearchQuery(),
      session_id: getSessionId(),
      order_id: String(checkout.order_id || checkout.id),
      order_total: parseFloat(checkout.total_price),
      cart_count: checkout.line_items?.length || 0,
      cart_items: checkout.line_items?.map(item => ({
        product_id: String(item.product_id),
        product_name: item.title,
        variant_id: String(item.variant_id),
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: parseFloat(item.price)
      })) || [],
      payment_method: checkout.payment_method?.type
    };

    log('✅ Checkout Completed:', eventData);
    sendTrackingEvent(eventData);

    // Clear search data after successful purchase
    localStorage.removeItem(TRACKING_CONFIG.searchQueryKey);
    localStorage.removeItem(TRACKING_CONFIG.searchResultsKey);
  }

  /**
   * Track Product Click (with debounce to prevent duplicates)
   */
  const trackProductClick = (function() {
    const recentClicks = new Map();
    const DEBOUNCE_MS = 1000; // 1 second
    
    return function(productData, context = {}) {
      console.group('🖱️ [Semantix Tracking] Product Click Detected');
      
      log('📦 Product data received:', productData);
      log('📋 Context:', context);
      
      const productId = String(productData.id);
      const now = Date.now();
      
      log(`🆔 Product ID: ${productId}`);
      log(`⏰ Timestamp: ${new Date(now).toISOString()}`);
      
      // Check if we recently tracked this product
      if (recentClicks.has(productId)) {
        const lastClick = recentClicks.get(productId);
        const timeSinceLastClick = now - lastClick;
        
        log(`⏱️ Last click was ${timeSinceLastClick}ms ago`);
        
        if (timeSinceLastClick < DEBOUNCE_MS) {
          console.warn(`⏭️ Skipping duplicate click for product: ${productId} (debounce active)`);
          console.groupEnd();
          return;
        }
      }
      
      // Update last click time
      recentClicks.set(productId, now);
      log(`✅ Click registered for product: ${productId}`);
      
      // Clean up old entries (keep only last 100)
      if (recentClicks.size > 100) {
        const oldestKey = recentClicks.keys().next().value;
        recentClicks.delete(oldestKey);
        log(`🧹 Cleaned up old click entry: ${oldestKey}`);
      }

      const searchQuery = context.search_query || getLastSearchQuery();
      const sessionId = getSessionId();
      
      log(`🔍 Search query: "${searchQuery || '(none)'}"`);
      log(`🪪 Session ID: ${sessionId}`);

      const eventData = {
        event_type: 'product_click',
        product_id: productId,
        product_name: productData.title,
        search_query: searchQuery,
        session_id: sessionId,
        interaction_type: context.interaction_type || 'click',
        position: context.position,
        source: context.source || 'product_link',
        url: productData.url || window.location.href
      };

      log('📊 Final event data:', eventData);
      console.groupEnd();
      
      sendTrackingEvent(eventData);
    };
  })();

  // ==================== Event Listeners ====================

  /**
   * Listen for Add to Cart events
   */
  function initAddToCartTracking() {
    // Method 1: Form submission (standard product forms)
    document.addEventListener('submit', (e) => {
      const form = e.target;
      
      if (form.matches('form[action*="/cart/add"]')) {
        const formData = new FormData(form);
        
        // Extract product data from form
        const productData = {
          variant_id: formData.get('id'),
          quantity: parseInt(formData.get('quantity')) || 1
        };

        // Try to get product info from page
        const productJson = document.querySelector('[data-product-json]');
        if (productJson) {
          try {
            const product = JSON.parse(productJson.textContent);
            productData.id = product.id;
            productData.title = product.title;
            productData.price = product.price;
          } catch (e) {
            log('Failed to parse product JSON:', e);
          }
        }

        trackAddToCart(productData);
      }
    });

    // Method 2: AJAX Add to Cart (modern themes)
    // Override fetch for cart/add endpoints
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url, options] = args;
      
      if (url.includes('/cart/add')) {
        return originalFetch.apply(this, args).then(response => {
          if (response.ok) {
            // Try to extract product data from request body
            if (options?.body) {
              try {
                const body = JSON.parse(options.body);
                if (body.items || body.id) {
                  const items = body.items || [body];
                  items.forEach(item => trackAddToCart(item));
                }
              } catch (e) {
                log('Could not parse add-to-cart request:', e);
              }
            }
          }
          return response;
        });
      }
      
      return originalFetch.apply(this, args);
    };

    log('✅ Add to Cart tracking initialized');
  }

  /**
   * Listen for Checkout button clicks
   */
  function initCheckoutTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (!target) return;

      // Detect checkout button
      const href = target.getAttribute('href') || '';
      const name = target.getAttribute('name') || '';
      const className = target.className || '';

      if (
        href.includes('/checkout') ||
        name.includes('checkout') ||
        className.includes('checkout')
      ) {
        log('Checkout button clicked');
        trackCheckoutInitiated();
      }
    });

    log('✅ Checkout tracking initialized');
  }

  /**
   * Track on thank-you page
   */
  function initThankYouTracking() {
    // Check if we're on thank-you page
    if (
      window.location.pathname.includes('/thank') ||
      window.location.pathname.includes('/orders/') ||
      (window.Shopify && window.Shopify.Checkout && window.Shopify.checkout)
    ) {
      log('Thank-you page detected');
      trackCheckoutCompleted();
    }
  }

  /**
   * Listen for product clicks (single global listener)
   */
  function initProductClickTracking() {
    console.group('🔧 [Semantix Tracking] Init Product Click Tracking');
    
    // Guard: Check if already attached
    if (window.__semantix_tracking_listeners_attached) {
      console.warn('⚠️ Product click listeners already attached, skipping');
      console.groupEnd();
      return;
    }
    
    log('🎯 Attaching click listener to document...');
    
    // Use capture phase to ensure we catch it first
    const clickHandler = (e) => {
      log('👆 Click detected on:', e.target);
      
      const link = e.target.closest('a[href*="/products/"]');
      
      if (!link) {
        // Only log in debug mode
        if (window.SemantixSettings?.debug) {
          log('ℹ️ Click was not on a product link');
        }
        return;
      }
      
      log('🔗 Product link found:', link.href);

      const productCard = link.closest('[data-product-id], .product-card, .product-item, .grid__item, [class*="product"]');
      log('🎴 Product card:', productCard);
      
      if (productCard) {
        const productId = productCard.getAttribute('data-product-id') || 
                         productCard.getAttribute('data-product_id') ||
                         extractProductIdFromUrl(link.href);
        const productTitle = productCard.querySelector('.product-title, [data-product-title], h3, .card__heading')?.textContent?.trim();

        log(`🆔 Product ID: ${productId || '(not found)'}`);
        log(`📝 Product title: "${productTitle || '(not found)'}"`);
        log(`🔗 Product URL: ${link.href}`);

        if (productId) {
          trackProductClick({
            id: productId,
            title: productTitle,
            url: link.href
          }, {
            source: 'product_grid'
          });
        } else {
          log('⚠️ Could not extract product ID');
        }
      } else {
        log('⚠️ Could not find product card wrapper');
      }
    };

    // Add listener with { once: false, capture: true }
    document.addEventListener('click', clickHandler, { capture: true });
    
    // Mark as attached
    window.__semantix_tracking_listeners_attached = true;

    log('✅ Product click tracking initialized');
    log('📊 Listener attached in capture phase');
    console.groupEnd();
  }

  /**
   * Extract product ID from URL
   */
  function extractProductIdFromUrl(url) {
    const match = url.match(/\/products\/([^/?]+)/);
    return match ? match[1] : null;
  }

  // ==================== Search Result Storage ====================

  /**
   * Store search results for later tracking
   */
  function storeSearchResults(results) {
    if (!Array.isArray(results)) return;
    
    const productIds = results.map(r => String(r.id || r.product_id)).filter(Boolean);
    setLocalStorage(TRACKING_CONFIG.searchResultsKey, productIds);
    log('Stored search results:', productIds.length);
  }

  // Make it available globally
  window.SemantixTracking = {
    trackAddToCart,
    trackCheckoutInitiated,
    trackCheckoutCompleted,
    trackProductClick,
    storeSearchResults,
    processQueue
  };

  // ==================== Initialization ====================

  function init() {
    console.group('🚀 [Semantix Tracking] Initialization');
    
    // Guard: prevent double initialization
    if (window.__semantix_tracking_initialized) {
      console.warn('⚠️ Tracking already initialized, skipping');
      console.groupEnd();
      return;
    }
    window.__semantix_tracking_initialized = true;
    
    log('📋 SemantixSettings:', window.SemantixSettings);
    log('🪪 Session ID:', getSessionId());

    log('🎯 Initializing Semantix Tracking...');

    // Enable debug if Semantix is in debug mode
    if (window.SemantixSettings?.debug) {
      TRACKING_CONFIG.debug = true;
      log('🐛 Debug mode enabled');
    }

    // Wait for DOM ready
    log(`📄 Document ready state: ${document.readyState}`);
    
    if (document.readyState === 'loading') {
      log('⏳ Waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', initTracking);
    } else {
      log('✅ DOM already ready, initializing now...');
      initTracking();
    }
    
    console.groupEnd();
  }

  function initTracking() {
    console.group('🎬 [Semantix Tracking] Init Tracking Functions');
    
    // Double-check guard inside initTracking too
    if (window.__semantix_tracking_listeners_attached) {
      console.warn('⚠️ Event listeners already attached, skipping');
      console.groupEnd();
      return;
    }
    
    log('🔒 Setting listeners attached flag...');
    window.__semantix_tracking_listeners_attached = true;

    log('🛒 Initializing Add to Cart tracking...');
    initAddToCartTracking();
    
    log('💳 Initializing Checkout tracking...');
    initCheckoutTracking();
    
    log('👆 Initializing Product Click tracking...');
    initProductClickTracking();
    
    log('🎉 Initializing Thank You page tracking...');
    initThankYouTracking();

    // Process any queued events
    log('📦 Processing queued events...');
    processQueue();

    log('✅ All tracking functions initialized');
    console.groupEnd();
  }

  // Start
  init();

})();

