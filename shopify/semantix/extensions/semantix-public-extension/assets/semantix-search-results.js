(function() {
    'use strict';

    // Configuration
    let SEMANTIX_CONFIG = {
        apiKey: '',
        dbName: 'manoVino',
        apiEndpoint: 'https://shopifyserver-1.onrender.com'
    };

    // Load settings from various sources
    function loadSettings() {
        // Check for global settings
        if (window.SEMANTIX_SETTINGS) {
            SEMANTIX_CONFIG = { ...SEMANTIX_CONFIG, ...window.SEMANTIX_SETTINGS };
            return;
        }
        
        // Check search bar container for settings
        const searchContainer = document.querySelector('[data-semantix-search]');
        if (searchContainer) {
            if (searchContainer.dataset.apiKey) SEMANTIX_CONFIG.apiKey = searchContainer.dataset.apiKey;
            if (searchContainer.dataset.dbName) SEMANTIX_CONFIG.dbName = searchContainer.dataset.dbName;
        }
    }

    // Main search results handler
    async function handleSearchResults() {
        loadSettings();
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');

        const productsContainer = document.getElementById('semantix-products-container');
        const loadingMessage = document.getElementById('semantix-loading-message');
        const spinner = document.getElementById('semantix-loading-spinner');
        const errorMessage = document.getElementById('semantix-error-message');
        const searchTitle = document.getElementById('semantix-search-title');

        // Reset all states
        if (errorMessage) errorMessage.style.display = 'none';
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (spinner) spinner.style.display = 'none';

        // Validate required elements
        if (!productsContainer) {
            console.error('Semantix Search Results: Products container not found');
            return;
        }

        if (!searchQuery) {
            if (searchTitle) {
                searchTitle.textContent = 'אנא הזן שאילתת חיפוש.';
            }
            return;
        }

        if (searchTitle) {
            searchTitle.textContent = `תוצאות חיפוש עבור "${searchQuery}"`;
        }

        // Check for cached results
        const cacheKey = `semantix_search_${searchQuery}`;
        const lastQuery = sessionStorage.getItem('semantix_last_query');
        
        // Clear old cache if query changed
        if (lastQuery && lastQuery !== searchQuery) {
            const oldCacheKey = `semantix_search_${lastQuery}`;
            sessionStorage.removeItem(oldCacheKey);
        }
        
        sessionStorage.setItem('semantix_last_query', searchQuery);
        
        const cachedResults = sessionStorage.getItem(cacheKey);
        if (cachedResults) {
            try {
                const products = JSON.parse(cachedResults);
                displayProducts(products);
                return;
            } catch (e) {
                console.warn('Failed to parse cached results:', e);
            }
        }

        // Show loading state
        if (spinner) spinner.style.display = 'block';
        if (loadingMessage) loadingMessage.style.display = 'block';

        try {
            const requestBody = {
                dbName: SEMANTIX_CONFIG.dbName,
                collectionName: 'products',
                query: searchQuery,
                noHebrewWord: ['כשר', "ש''ח", 'אדום', 'לבן', 'יין', 'מבעבע', 'רוזה', 'מעל', 'עד', 'מתחת', 'יותר', 'ש"ח', 'שקלים'],
                categories: 'מארז ,יין אדום, יין לבן, יין רוזה, יין מבעבע, וויסקי, קוניאק, בירה, ערק, ג׳ין, סאקה',
                types: 'כשר',
                example: "{ 'category': ['יין לבן'], 'minPrice': 100, 'maxPrice': 200, type:'כשר' }"
            };

            const headers = {
                'Content-Type': 'application/json'
            };

            if (SEMANTIX_CONFIG.apiKey) {
                headers['Authorization'] = `Bearer ${SEMANTIX_CONFIG.apiKey}`;
            }

            const response = await fetch(`${SEMANTIX_CONFIG.apiEndpoint}/search`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const products = await response.json();
            
            if (!products || products.length === 0) {
                showError('לא נמצאו תוצאות התואמות לחיפוש שלך. נסה לחפש במילים אחרות.');
                return;
            }

            // Cache the results
            sessionStorage.setItem(cacheKey, JSON.stringify(products));
            displayProducts(products);

        } catch (error) {
            console.error('Semantix Search Error:', error);
            showError('שגיאה בטעינת תוצאות החיפוש. אנא נסה שוב מאוחר יותר.');
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (spinner) spinner.style.display = 'none';
        }
    }

    function displayProducts(products) {
        const productsContainer = document.getElementById('semantix-products-container');
        if (!productsContainer) return;

        productsContainer.innerHTML = '';

        products.forEach((product, index) => {
            const productElement = document.createElement('div');
            productElement.className = 'semantix-product-card';
            productElement.setAttribute('data-product-id', product.id || index);

            const highlightBadge = product.highlight ? `
                <div class="semantix-highlight-badge">
                    <img src="https://alcohome.co.il/wp-content/uploads/2024/09/ai_stars_icon-removebg-preview.png" alt="מתאים במיוחד" loading="lazy" />
                    <span>התאמה מושלמת!</span>
                </div>
            ` : '';

            productElement.innerHTML = `
                ${highlightBadge}
                <img 
                    src="${product.image || '/placeholder-product.jpg'}" 
                    alt="${product.name || 'מוצר'}"
                    loading="lazy"
                    onerror="this.src='/placeholder-product.jpg'"
                />
                <h3>${product.name || 'מוצר ללא שם'}</h3>
                <p>₪${product.price || '0'}</p>
            `;

            // Add click handler
            productElement.addEventListener('click', () => {
                if (product.url) {
                    // Track click event
                    trackProductClick(product, index);
                    window.location.href = product.url;
                } else {
                    console.warn('Product URL not found:', product);
                }
            });

            // Add keyboard accessibility
            productElement.setAttribute('tabindex', '0');
            productElement.setAttribute('role', 'button');
            productElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    productElement.click();
                }
            });

            productsContainer.appendChild(productElement);
        });

        // Track search results view
        trackSearchResults(products.length);
    }

    function showError(message) {
        const errorMessage = document.getElementById('semantix-error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    // Analytics functions
    function trackSearchResults(resultCount) {
        try {
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'search', {
                    search_term: new URLSearchParams(window.location.search).get('q'),
                    result_count: resultCount
                });
            }
            
            // Shopify Analytics
            if (window.ShopifyAnalytics) {
                window.ShopifyAnalytics.track('search', {
                    query: new URLSearchParams(window.location.search).get('q'),
                    results: resultCount
                });
            }
        } catch (e) {
            console.warn('Analytics tracking failed:', e);
        }
    }

    function trackProductClick(product, position) {
        try {
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'select_item', {
                    item_list_id: 'search_results',
                    item_list_name: 'Search Results',
                    items: [{
                        item_id: product.id,
                        item_name: product.name,
                        item_category: product.category,
                        price: product.price,
                        index: position
                    }]
                });
            }
        } catch (e) {
            console.warn('Product click tracking failed:', e);
        }
    }

    // Initialize on page load
    function initializeSearchResults() {
        // Only run on search pages
        if (window.location.pathname.includes('/search') || 
            document.querySelector('#semantix-products-container')) {
            handleSearchResults();
        }
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSearchResults);
    } else {
        initializeSearchResults();
    }

// Handle browser back/forward navigation
window.addEventListener('popstate', initializeSearchResults);

// Re-run on Shopify section loads (theme editor compatibility)
document.addEventListener('shopify:section:load', initializeSearchResults);

// Expose global function for external use
window.semantixSearchResults = {
    refresh: initializeSearchResults,
    updateSettings: (newSettings) => {
        SEMANTIX_CONFIG = { ...SEMANTIX_CONFIG, ...newSettings };
        initializeSearchResults();
    }
};

})();