<?php
/**
 * Template Name: Semantix AI – Native WooCommerce Search (Preserve Original Design)
 * File: search-custom.php
 * Place this file in: /wp-content/plugins/semantix-ai-search/templates/search-custom.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// API settings
$semantix_search_host = rtrim( get_option( 'semantix_api_endpoint', '' ), '/' );
$semantix_api_key     = get_option( 'semantix_api_key', '' );
$ajax_url   = admin_url('admin-ajax.php');
$ajax_nonce = wp_create_nonce('semantix_nonce');

get_header();
?>

<style>
/* ===== MINIMAL STYLING - LET WOOCOMMERCE HANDLE EVERYTHING ===== */

.semantix-wrapper {
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
    padding-right: 15px;
}

.semantix-powered-logo {
    opacity: 0.7;
    transition: opacity 0.3s ease;
    padding-left: 15px;
}

.semantix-powered-logo:hover {
    opacity: 1;
}

/* ===== CONTAINER - NO OVERRIDES ===== */
.semantix-results-container {
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

<div class="semantix-wrapper">
    <div class="semantix-header">
        <h1 class="semantix-search-title" id="semantix-search-title">תוצאות חיפוש</h1>
        <a href="https://semantix.co.il" target="_blank" class="semantix-powered-logo" rel="noopener">
            <img src="https://semantix-ai.com/powered.png" alt="Semantix logo" width="120" loading="lazy">
        </a>
    </div>

    <div class="woocommerce">
        <div id="semantix-results-container" class="semantix-results-container"></div>
    </div>
</div>

<script>
(function () {
    'use strict';
    
    // Configuration
    const SEMANTIX_API_SEARCH_ENDPOINT = <?php echo wp_json_encode( rtrim($semantix_search_host, '/') . '/search' ); ?>;
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

    // Start search
    showLoading();
    executeSearch();

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
        return `semantix_native_${encodeURIComponent(term)}`;
    }

    function getFromCache(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data;
                }
                sessionStorage.removeItem(key);
            }
        } catch (e) {
            sessionStorage.removeItem(key);
        }
        return null;
    }

    function saveToCache(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.warn('Failed to save to cache:', e);
        }
    }

    // --- make theme CSS apply like native search/archive ---
    function applyWooBodyClasses() {
        const cls = [
            'archive','search','woocommerce','woocommerce-page',
            'post-type-archive','post-type-archive-product'
        ];
        cls.forEach(c => document.body.classList.add(c));
    }

    // Wrap raw <li class="product"> items with expected WooCommerce structure if needed
    function ensureNativeWrappers(html) {
        const hasProductsWrapper = /<ul[^>]*class="[^"]*\bproducts\b[^"]*"/i.test(html);
        if (hasProductsWrapper) return html;

        const items = html.match(/<li[^>]*class="[^"]*\bproduct\b[^"]*"[\s\S]*?<\/li>/gi) || [];
        if (!items.length) return html;

        const columns = 4; // adjust to your theme if needed
        const wrapped = `
            <div class="semantix-native-archive archive woocommerce woocommerce-page">
              <div class="woocommerce-notices-wrapper"></div>
              <ul class="products columns-${columns}">
                ${items.join('\n')}
              </ul>
            </div>
        `;
        return wrapped;
    }

    // Fetch products from Semantix API
    async function fetchSemantixProducts() {
        try {
            // use your endpoint if configured: SEMANTIX_API_SEARCH_ENDPOINT
            const response = await fetch('https://dashboard-server-ae00.onrender.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(SEMANTIX_API_KEY ? { 'x-api-key': SEMANTIX_API_KEY } : {})
                },
                body: JSON.stringify({ query: searchTerm, useImages: true }),
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Semantix API Error: ${response.status}`);
            }

            const products = await response.json();
            return Array.isArray(products) ? products : [];

        } catch (error) {
            console.error('Semantix API Error:', error);
            throw error;
        }
    }

    // Send POST to admin-ajax with fallback
    async function requestRendered(formData) {
        const res = await fetch(WP_AJAX_URL, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        const text = await res.text();
        if (!res.ok || text.trim() === '0') {
            throw new Error(`WP ${res.status} - ${text.trim()}`);
        }
        return text;
    }

    // Get rendered WooCommerce products using NATIVE theme styling
    async function fetchRenderedWooCommerceProducts(semantixProducts) {
        const productIds = semantixProducts
            .map(p => p.id)
            .filter(id => id && Number.isInteger(Number(id)) && Number(id) > 0);

        const highlightMap = {};
        const explanationMap = {}; // <-- NEW

        semantixProducts.forEach(p => {
            if (p.id) {
                highlightMap[p.id]  = p.highlight || false;
                if (p.explanation) {
                    explanationMap[p.id] = String(p.explanation);
                }
            }
        });

        if (productIds.length === 0) {
            showMessage('לא נמצאו מוצרים תואמים במערכת לאחר סינון.');
            return;
        }

        try {
            // try "native" action if present
            const fdNative = new URLSearchParams();
            fdNative.append('action', 'semantix_render_products_native');
            fdNative.append('product_ids', JSON.stringify(productIds));
            fdNative.append('highlight_map', JSON.stringify(highlightMap));
            fdNative.append('explanation_map', JSON.stringify(explanationMap)); // <-- NEW
            fdNative.append('search_term', searchTerm);
            fdNative.append('render_mode', 'native');
            fdNative.append('use_theme_templates', '1');
            fdNative.append('nonce', WP_AJAX_NONCE);

            let html;
            try {
                html = await requestRendered(fdNative);
            } catch (e) {
                // fallback to existing action
                console.warn('Native action failed, falling back. Reason:', e.message);
                const fdFallback = new URLSearchParams();
                fdFallback.append('action', 'semantix_render_products');
                fdFallback.append('product_ids', JSON.stringify(productIds));
                fdFallback.append('highlight_map', JSON.stringify(highlightMap));
                fdFallback.append('explanation_map', JSON.stringify(explanationMap)); // <-- NEW
                fdFallback.append('search_term', searchTerm);
                fdFallback.append('render_mode', 'native');
                fdFallback.append('nonce', WP_AJAX_NONCE);
                html = await requestRendered(fdFallback);
            }

            if (!html || !html.trim()) {
                showMessage('לא ניתן היה להציג את המוצרים (תשובה ריקה מהשרת).');
                return;
            }

            // Ensure theme styling context
            applyWooBodyClasses();

            const nativeHtml = ensureNativeWrappers(html);
            resultsContainer.innerHTML = nativeHtml;

        } catch (error) {
            console.error('WordPress AJAX Error:', error);
            showMessage(`שגיאה בהצגת המוצרים: ${error.message}`);
        } finally {
            initializeNativeWooCommerce();
        }
    }

    function initializeNativeWooCommerce() {
        if (typeof jQuery !== 'undefined') {
            const $ = jQuery;
            $(document.body).trigger('wc_fragment_refresh');
            $(document.body).trigger('wc_fragments_loaded');
            $(document.body).trigger('woocommerce_update_order_review');

            $('.variations_form').each(function() {
                if (typeof $(this).wc_variation_form === 'function') {
                    $(this).wc_variation_form();
                }
            });

            $('.add_to_cart_button').off('click.wc-add-to-cart');
        }
        
        document.dispatchEvent(new CustomEvent('semantix_native_products_loaded', { 
            bubbles: true,
            detail: { searchTerm }
        }));
        
        setTimeout(() => {
            if (window.wc_add_to_cart_params && typeof jQuery !== 'undefined') {
                jQuery(document.body).trigger('init_add_to_cart_button');
            }
        }, 100);
    }

    // Main execution - preserve native WooCommerce experience
    async function executeSearch() {
        const cacheKey = getCacheKey(searchTerm);
        const cached = getFromCache(cacheKey);

        if (cached) {
            console.log('Loading results from cache');
            await fetchRenderedWooCommerceProducts(cached);
            return;
        }

        try {
            const semantixProducts = await fetchSemantixProducts();
            if (semantixProducts.length === 0) {
                showMessage('לא נמצאו תוצאות עבור החיפוש שלך.');
                return;
            }
            saveToCache(cacheKey, semantixProducts);
            await fetchRenderedWooCommerceProducts(semantixProducts);

        } catch (error) {
            console.error('Search execution error:', error);
            showMessage(`שגיאה בטעינת התוצאות: ${error.message}`);
        }
    }

})();
</script>

<?php get_footer(); ?>
