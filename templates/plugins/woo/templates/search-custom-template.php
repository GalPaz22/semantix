<?php
/**
 * Semantix Custom Search Results Template - Fully Independent
 *
 * This template renders the entire search results page outside the theme's <main>
 * element to avoid unwanted inherited styles. It includes all adjustable features.
 *
 * FEATURES:
 * - NEW: Renders as a full-page container, ignoring theme's <main> element styles.
 * - NEW: AI "stars" icon added to the LLM explanation box for visual appeal.
 * - Modest and refined search results header.
 * - Shekel currency symbol (₪) automatically added to prices.
 * - Fully Adjustable Typography for titles and prices.
 *
 * @package SemantixAI
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Get the search query from the URL.
$search_query = get_search_query();
$show_header_title = get_option('semantix_show_header_title', 1);

// --- ADJUSTABLE TYPOGRAPHY SETTINGS ---
$title_font_family = get_option( 'semantix_title_font_family', "'Inter', sans-serif" );
$title_font_weight = get_option( 'semantix_title_font_weight', '600' );
$price_font_family = get_option( 'semantix_price_font_family', "'Inter', sans-serif" );
$price_font_weight = get_option( 'semantix_price_font_weight', '700' );

// Get custom template settings from options.
$card_width     = get_option( 'semantix_card_width', '320' );
$card_height    = get_option( 'semantix_card_height', '420' );
$image_height   = get_option( 'semantix_image_height', '240' );
$card_bg        = get_option( 'semantix_card_bg_color', '#ffffff' );
$title_color    = get_option( 'semantix_title_color', '#1a1a1a' );
$price_color    = get_option( 'semantix_price_color', '#2563eb' );

// Get API settings
$api_endpoint   = get_option( 'semantix_search_api_endpoint', 'https://dashboard-server-ae00.onrender.com/search' );
$api_key        = get_option( 'semantix_api_key', '' );
$dbname         = get_option( 'semantix_dbname', 'alcohome' );
$c1             = get_option( 'semantix_collection1', 'products' );
$c2             = get_option( 'semantix_collection2', 'queries' );

// Prepare data for JavaScript
$js_data = [
    'nonce'        => wp_create_nonce( 'semantix_custom_search_nonce' ),
    'apiEndpoint'  => $api_endpoint,
    'apiKey'       => $api_key,
    'dbName'       => $dbname,
    'collection1'  => $c1,
    'collection2'  => $c2,
    'searchQuery'  => $search_query,
];

get_header(); // Load the site header ?>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    /* This wrapper replaces the theme's <main> container */
    .semantix-results-page-wrapper {
        width: 100%;
        margin: 0 auto;
        padding: 0;
        font-family: <?php echo esc_attr( $title_font_family ); ?>;
    }

    /* Inner container for content alignment */
    #semantix-custom-results-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    /* Page header - MODEST AND REFINED */
    .semantix-page-header {
        text-align: center;
        margin-bottom: 2.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f0f0f0;
    }

    .semantix-page-title {
        font-size: 1.25rem;
        font-weight: 400;
        color: #6b7280;
        margin: 0;
    }

    .semantix-page-title span {
        font-weight: 600;
        color: #1f2937;
        margin-left: 0.5ch;
    }

    /* Results grid */
    #semantix-custom-results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(<?php echo esc_attr( max(280, $card_width) ); ?>px, 1fr));
        gap: 2rem;
        justify-items: center;
        margin-top: 2rem;
    }

    /* Product cards */
    .semantix-product-card {
        width: 100%;
        max-width: <?php echo esc_attr( $card_width ); ?>px;
        min-height: <?php echo esc_attr( $card_height ); ?>px;
        background: <?php echo esc_attr( $card_bg ); ?>;
        border-radius: 16px; /* Slightly softer radius */
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid #f3f4f6;
        display: flex;
        flex-direction: column;
    }

    .semantix-product-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 12px 24px -5px rgba(0,0,0,0.1);
    }

    .semantix-product-link { text-decoration: none; }

    /* Product image container */
    .semantix-product-image-container {
        position: relative;
        width: 100%;
        height: <?php echo esc_attr( $image_height ); ?>px;
        overflow: hidden;
        background: #fdfdfd;
    }

    .semantix-product-image {
        width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease;
    }
    .semantix-product-card:hover .semantix-product-image { transform: scale(1.05); }
    
    /* Product content */
    .semantix-product-content {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        text-align: center;
    }

    .semantix-product-title {
        font-family: <?php echo esc_attr( $title_font_family ); ?>;
        font-weight: <?php echo esc_attr( $title_font_weight ); ?>;
        color: <?php echo esc_attr( $title_color ); ?>;
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.4;
        flex-grow: 1;
    }
    .semantix-product-title a { text-decoration: none; color: inherit; transition: color 0.2s ease; }
    .semantix-product-title a:hover { color: #2563eb; }

    .semantix-product-price {
        font-family: <?php echo esc_attr( $price_font_family ); ?>;
        font-weight: <?php echo esc_attr( $price_font_weight ); ?>;
        color: <?php echo esc_attr( $price_color ); ?>;
        font-size: 1.2rem;
        margin: 0.5rem 0 0;
    }

    /* Product Explanation - WITH AI STARS ICON */
    .semantix-product-explanation {
        font-size: 0.875rem;
        color: #4b5563;
        line-height: 1.5;
        margin: 1rem 0;
        padding: 0.75rem 2.5rem 0.75rem 1rem; /* Padding on right for icon */
        background: #f9fafb;
        border-radius: 8px;
        text-align: right;
        direction: rtl;
        position: relative; /* Needed for icon positioning */
    }

    .semantix-product-explanation::before {
        content: '✨'; /* The AI stars icon */
        position: absolute;
        top: 0.75rem;
        right: 1rem; /* Positioned on the right for RTL */
        font-size: 1rem;
        color: #60a5fa;
    }

    /* Badges */
    .semantix-perfect-match-badge {
        position: absolute; top: 12px; left: 12px; background: #1a1a1a; color: white;
        padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.05em; z-index: 2;
    }
    
    /* Loading, Empty, and Error States */
    .semantix-loader, .semantix-empty-state, .semantix-error-state {
        grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: #6b7280;
    }
    .semantix-loader::before {
        content: ''; display: inline-block; width: 2rem; height: 2rem; border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 1rem; vertical-align: middle;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

</style>

<!-- This is the main container that renders instead of the theme's <main> element -->
<div class="semantix-results-page-wrapper">
    <div id="semantix-custom-results-container">
        <?php if ($show_header_title) : ?>
        <header class="semantix-page-header">
            <h1 class="semantix-page-title">
                <?php
                /* translators: %s: search query. */
                printf( esc_html__( 'Search Results for: %s', 'semantix-ai-search' ), '<span>' . esc_html( $search_query ) . '</span>' );
                ?>
            </h1>
        </header>
        <?php endif; ?>

        <div id="semantix-custom-results-grid">
            <div class="semantix-loader">Loading products...</div>
        </div>
    </div>
</div>

<script id="semantix-custom-template-js">
document.addEventListener('DOMContentLoaded', () => {
    const SEMANTIX_DATA = <?php echo wp_json_encode( $js_data ); ?>;
    const resultsGrid = document.getElementById('semantix-custom-results-grid');

    async function fetchResults() {
        if (!SEMANTIX_DATA.searchQuery || !SEMANTIX_DATA.apiEndpoint) {
            showErrorState('Search configuration is incomplete.');
            return;
        }

        try {
            const response = await fetch(SEMANTIX_DATA.apiEndpoint, { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json',
                    ...(SEMANTIX_DATA.apiKey && {'x-api-key': SEMANTIX_DATA.apiKey}) 
                },
                body: JSON.stringify({
                    query: SEMANTIX_DATA.searchQuery,
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

    fetchResults();
});
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
<?php get_footer(); // Load the site footer ?>