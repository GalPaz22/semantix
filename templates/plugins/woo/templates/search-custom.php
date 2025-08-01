<?php
/**
 * Template Name: Semantix AI – Native WooCommerce Search
 * File: search-custom.php
 * Place this file in: /wp-content/plugins/semantix-ai-search/templates/search-custom.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// API settings
$semantix_api_key = get_option( 'semantix_api_key', '' );
$ajax_url = admin_url('admin-ajax.php');
$ajax_nonce = wp_create_nonce('semantix_nonce');

get_header();
?>

<style>
/* ===== MINIMAL STYLING - LET WOOCOMMERCE HANDLE EVERYTHING ===== */

.semantix-wrapper {
    /* Use theme's container styling */
    max-width: inherit;
    margin: 0;
    padding: 0;
}

/* Simple header styling */
.semantix-header {
    direction: rtl;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px 0 15px 0;
    border-bottom: 1px solid #eee;
}

.semantix-search-title {
    font-size: 24px;
    margin: 0;
    color: inherit;
    font-family: inherit;
}

.semantix-powered-logo {
    opacity: 0.7;
    transition: opacity 0.3s ease;
}

.semantix-powered-logo:hover {
    opacity: 1;
}

/* ===== CONTAINER - NO OVERRIDES ===== */
.semantix-results-container {
    /* Let WooCommerce and theme handle ALL styling */
    position: relative;
}

/* ===== LOADING AND MESSAGES ONLY ===== */
.semantix-loading {
    text-align: center;
    padding: 40px 20px;
}

.semantix-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007cba;
    border-radius: 50%;
    animation: semantix-spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes semantix-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.semantix-message {
    text-align: center;
    padding: 30px 20px;
    color: #666;
    background: #f9f9f9;
    border-radius: 4px;
    margin: 20px 0;
}

/* ===== RESPONSIVE HEADER ONLY ===== */
@media (max-width: 768px) {
    .semantix-header {
        flex-direction: column;
        text-align: center;
        gap: 15px;
    }
    
    .semantix-search-title {
        font-size: 20px;
    }
}
</style>

<!-- Use theme's content structure -->
<div class="semantix-wrapper">
    <div class="semantix-header">
        <h1 class="semantix-search-title" id="semantix-search-title">תוצאות חיפוש</h1>
        <a href="https://semantix.co.il" target="_blank" class="semantix-powered-logo">
            <img src="https://semantix-ai.com/powered.png" alt="Semantix logo" width="120">
        </a>
    </div>

    <!-- Let WooCommerce handle ALL product styling -->
    <div class="woocommerce">
        <div id="semantix-results-container" class="semantix-results-container">
            <!-- Native WooCommerce products will be inserted here -->
        </div>
    </div>
</div>

<script>
(function () {
    'use strict';
    
    // Configuration
    const SEMANTIX_API_SEARCH_ENDPOINT = 'https://dashboard-server-ae00.onrender.com/search';
    const SEMANTIX_API_KEY = <?php echo wp_json_encode( $semantix_api_key ); ?>;
    const WP_AJAX_URL = <?php echo wp_json_encode( $ajax_url ); ?>;
    const WP_AJAX_NONCE = <?php echo wp_json_encode( $ajax_nonce ); ?>;

    // DOM Elements
    const searchTitleEl = document.getElementById('semantix-search-title');
    const resultsContainer = document.getElementById('semantix-results-container');

    // Get search term
    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('s') || '';

    // Cache
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Initialize
    if (!searchTerm) {
        showMessage('אנא הכנס מונח חיפוש.');
        return;
    }

    if (searchTitleEl) {
        searchTitleEl.textContent = `תוצאות חיפוש עבור "${searchTerm}"`;
    }

    // Check for cached results on page load
    const cachedResults = getFromCache(getCacheKey(searchTerm));
    if (cachedResults) {
        console.log('Loading results from localStorage on page load');
        renderProducts(cachedResults.semantixProducts, cachedResults.renderedHtml);
    } else {
        // Start search if no cached results
        showLoading();
        executeSearch();
    }

    // Helper functions
    function showLoading() {
        resultsContainer.innerHTML = `
            <div class="semantix-loading">
                <div class="semantix-spinner"></div>
                <p>טוען תוצאות...</p>
            </div>
        `;
    }

    function showMessage(message) {
        resultsContainer.innerHTML = `
            <div class="semantix-message">${message}</div>
        `;
    }

    function getCacheKey(term) {
        return `semantix_local_search_${encodeURIComponent(term)}`;
    }

    function getFromCache(key) {
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data;
                }
                localStorage.removeItem(key);
            }
        } catch (e) {
            localStorage.removeItem(key);
        }
        return null;
    }

    function saveToCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    // Fetch products from Semantix API
    async function fetchSemantixProducts() {
        const cacheKey = getCacheKey(`semantix_${searchTerm}`);
        const cached = getFromCache(cacheKey);
        
        if (cached) {
            console.log('Loading Semantix results from localStorage');
            return cached;
        }

        try {
            const response = await fetch(SEMANTIX_API_SEARCH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(SEMANTIX_API_KEY ? { 'x-api-key': SEMANTIX_API_KEY } : {})
                },
                body: JSON.stringify({ query: searchTerm, useImages: true })
            });

            if (!response.ok) {
                throw new Error(`Semantix API Error: ${response.status}`);
            }

            const data = await response.json();
            const products = data.results || [];
            
            saveToCache(cacheKey, products);
            return products;

        } catch (error) {
            console.error('Semantix API Error:', error);
            throw error;
        }
    }

    // Get rendered WooCommerce products using NATIVE theme styling
    async function fetchRenderedWooCommerceProducts(semantixProducts) {
        console.log('Semantix products received:', semantixProducts);
        
        const productIds = semantixProducts.map(p => p.id).filter(id => id && Number.isInteger(Number(id)) && Number(id) > 0);
        console.log('Filtered product IDs:', productIds);
        
        const highlightMap = {};
        semantixProducts.forEach(p => {
            if (p.id) highlightMap[p.id] = p.highlighted || false;
        });
        console.log('Highlight map:', highlightMap);

        if (productIds.length === 0) {
            return '';
        }

        const cacheKey = getCacheKey(`rendered_${searchTerm}`);
        const cached = getFromCache(cacheKey);
        
        if (cached) {
            console.log('Loading rendered WooCommerce products from localStorage');
            return cached;
        }
        
        const formData = new FormData();
        formData.append('action', 'semantix_render_products');
        formData.append('product_ids', JSON.stringify(productIds));
        formData.append('highlight_map', JSON.stringify(highlightMap));
        formData.append('search_term', searchTerm);
        formData.append('nonce', WP_AJAX_NONCE);

        console.log('Sending AJAX request with:', {
            product_ids: productIds,
            highlight_map: highlightMap,
            search_term: searchTerm
        });

        try {
            const response = await fetch(WP_AJAX_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('AJAX Response Error:', errorText);
                throw new Error(`AJAX Error: ${response.status}`);
            }

            const data = await response.json();
            const renderedHtml = data.success ? data.data : '';
            
            saveToCache(cacheKey, renderedHtml);
            return renderedHtml;
        } catch (error) {
            console.error('WordPress AJAX Error:', error);
            showMessage(`שגיאה בהצגת המוצרים: ${error.message}`);
            return ''; // Return empty string on error
        }
    }

    function initializeNativeWooCommerce() {
        // Let WooCommerce initialize everything naturally
        if (typeof jQuery !== 'undefined') {
            const $ = jQuery;
            
            // Trigger standard WooCommerce events
            $(document.body).trigger('wc_fragment_refresh');
            $(document.body).trigger('wc_fragments_loaded');
            $(document.body).trigger('woocommerce_update_order_review');
            
            // Initialize variation forms if present
            $('.variations_form').each(function() {
                $(this).wc_variation_form();
            });
            
            // Re-initialize add to cart functionality
            $('.add_to_cart_button').off('click.wc-add-to-cart');
            
            console.log('Native WooCommerce functionality initialized');
        }
        
        // Custom event for theme compatibility
        document.dispatchEvent(new CustomEvent('semantix_native_products_loaded', { 
            bubbles: true,
            detail: { searchTerm: searchTerm }
        }));
        
        // Let any theme scripts re-initialize
        setTimeout(() => {
            if (window.wc_add_to_cart_params && jQuery) {
                jQuery(document.body).trigger('init_add_to_cart_button');
            }
        }, 100);
    }

    // Main search function
    async function executeSearch() {
        try {
            const semantixProducts = await fetchSemantixProducts();

            if (semantixProducts.length === 0) {
                showMessage('לא נמצאו מוצרים התואמים את החיפוש שלך.');
                return;
            }

            const renderedHtml = await fetchRenderedWooCommerceProducts(semantixProducts);

            if (!renderedHtml.trim()) {
                showMessage('לא נמצאו מוצרים התואמים את החיפוש שלך.');
                return;
            }
            
            renderProducts(semantixProducts, renderedHtml);

        } catch (error) {
            console.error('Search execution error:', error);
            showMessage('אירעה שגיאה בביצוע החיפוש. נסה שנית מאוחר יותר.');
        }
    }

    function renderProducts(semantixProducts, renderedHtml) {
        resultsContainer.innerHTML = renderedHtml;

        // Save the combined results to cache for faster page load next time
        const combinedCacheKey = getCacheKey(searchTerm);
        saveToCache(combinedCacheKey, { semantixProducts, renderedHtml });

        // Your existing logic for Add to Cart, etc. can go here
        // For example, re-initializing any JS that needs to run on the new content.
        initializeNativeWooCommerce();
    }

})();
</script>
<script id="semantix-custom-template-js">
document.addEventListener('DOMContentLoaded', () => {
    const SEMANTIX_DATA = <?php echo wp_json_encode( $js_data ); ?>;
    const resultsGrid = document.getElementById('semantix-custom-results-grid');
    
    // Configuration constants
    const C = {
        cacheKey: 'semantix_search_cache',
        maxItems: 50, // Maximum number of results to cache
        expiryHours: 24 // Cache expires after 24 hours
    };

    const query = SEMANTIX_DATA.searchQuery;

    function loadCache() {
        try { 
            const cached = JSON.parse(sessionStorage.getItem(C.cacheKey));
            
            // Check if cache is valid and for the same query
            if (cached && cached.query === query && cached.ts) {
                const now = Date.now();
                const expiryTime = cached.ts + (C.expiryHours * 60 * 60 * 1000);
                
                if (now < expiryTime) {
                    console.log(`Semantix: Loaded ${cached.results.length} cached results for "${query}"`);
                    return cached.results;
                }
            }
            return null;
        }
        catch { return null; }
    }

    function saveCache(items) {
        try {
            sessionStorage.setItem(C.cacheKey,
                JSON.stringify({ 
                    query, 
                    results: items.slice(0, C.maxItems), 
                    ts: Date.now() 
                })
            );
            console.log(`Semantix: Cached ${items.length} results for "${query}"`);
        }
        catch (error) {
            console.warn('Semantix: Failed to save cache:', error);
        }
    }

    async function fetchResults() {
        if (!query || !SEMANTIX_DATA.apiEndpoint) {
            showErrorState('Search configuration is incomplete.');
            return;
        }

        // Try to load from cache first
        const cachedResults = loadCache();
        if (cachedResults) {
            renderProducts(cachedResults);
            return;
        }

        // If no cached results, fetch from API
        try {
            const response = await fetch(SEMANTIX_DATA.apiEndpoint, { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json',
                    ...(SEMANTIX_DATA.apiKey && {'x-api-key': SEMANTIX_DATA.apiKey}) 
                },
                body: JSON.stringify({
                    query: query,
                    dbName: SEMANTIX_DATA.dbName,
                    collectionName1: SEMANTIX_DATA.collection1,
                    collectionName2: SEMANTIX_DATA.collection2
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const products = Array.isArray(data) ? data : (data.products || (data.data && Array.isArray(data.data)) || []);
            
            // Save results to cache
            saveCache(products);
            
            renderProducts(products);

        } catch (error) {
            console.error('Semantix Search Fetch Error:', error);
            showErrorState(error.message);
        }
    }

    function renderProducts(products) {
        resultsGrid.innerHTML = '';
        
        if (!products || products.length === 0) {
            showEmptyState();
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'semantix-product-card';

            const productLink = product.url || `/?p=${product.id}`;
            const productImage = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            const productPrice = product.price ? `${product.price} ₪` : '';
            const perfectMatchBadge = product.highlight ? '<div class="semantix-perfect-match-badge">PERFECT MATCH</div>' : '';
            const productExplanation = product.explanation ? `<div class="semantix-product-explanation">${product.explanation}</div>` : '';

            card.innerHTML = `
                <a href="${productLink}" class="semantix-product-link" aria-label="View ${product.name || 'product'}">
                    <div class="semantix-product-image-container">
                        ${perfectMatchBadge}
                        <img src="${productImage}" alt="${product.name || 'Product Image'}" class="semantix-product-image" loading="lazy">
                    </div>
                </a>
                <div class="semantix-product-content">
                    <h2 class="semantix-product-title">
                        <a href="${productLink}">${product.name || 'Untitled Product'}</a>
                    </h2>
                    ${productExplanation}
                    ${productPrice ? `<div class="semantix-product-price">${productPrice}</div>` : ''}
                </div>
            `;
            
            resultsGrid.appendChild(card);
        });
    }

    function showEmptyState() {
        resultsGrid.innerHTML = `<div class="semantix-empty-state"><h3>No products found</h3><p>We couldn't find any products matching your search. Try different keywords.</p></div>`;
    }

    function showErrorState(message) {
        resultsGrid.innerHTML = `<div class="semantix-error-state"><h3>Something went wrong</h3><p>${message}</p></div>`;
    }

    // Expose function to manually clear search cache (optional)
    window.semantixClearSearchCache = function() {
        try {
            sessionStorage.removeItem(C.cacheKey);
            console.log('Semantix: Search cache cleared');
        } catch (error) {
            console.warn('Semantix: Failed to clear search cache:', error);
        }
    };

    fetchResults();
});
</script>
<?php get_footer(); ?>