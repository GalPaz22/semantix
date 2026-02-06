(function() {
    'use strict';
    
    // Prevent multiple initializations
    if (window.SEMANTIX_INITIALIZED) {
        console.warn('Semantix Search already initialized');
        return;
    }
    window.SEMANTIX_INITIALIZED = true;
    
    // Configuration - will be populated from script tag attributes
    let SEMANTIX_CONFIG = {
        apiKey: '',
        dbName: '',
        siteId: '',
        apiEndpoint: 'https://shopifyserver-1.onrender.com',
        placeholders: [
            "חיפוש מוצרים...",
            "מה אתם מחפשים?",
            "נסו חיפוש חכם"
        ],
        searchIcon: 'https://cdn.shopify.com/s/files/1/0911/9701/4333/files/ai-technology.png?v=1735062266',
        theme: 'light', // light, dark, auto
        language: 'he', // he, en
        enableSuggestions: true,
        enablePlaceholders: true,
        placeholderSpeed: 3000
    };

    // Get configuration from script tag data attributes
    function loadConfigFromScriptTag() {
        const scripts = document.querySelectorAll('script[src*="semantix-search.js"]');
        scripts.forEach(script => {
            // Get site-id from data-site-id attribute
            if (script.dataset.siteId) {
                SEMANTIX_CONFIG.siteId = script.dataset.siteId;
            }
            
            // Get other configuration from data attributes
            Object.keys(script.dataset).forEach(key => {
                const value = script.dataset[key];
                switch(key) {
                    case 'siteId':
                        SEMANTIX_CONFIG.siteId = value;
                        break;
                    case 'apiKey':
                        SEMANTIX_CONFIG.apiKey = value;
                        break;
                    case 'dbName':
                        SEMANTIX_CONFIG.dbName = value;
                        break;
                    case 'apiEndpoint':
                        SEMANTIX_CONFIG.apiEndpoint = value;
                        break;
                    case 'theme':
                        SEMANTIX_CONFIG.theme = value;
                        break;
                    case 'language':
                        SEMANTIX_CONFIG.language = value;
                        break;
                    case 'enableSuggestions':
                        SEMANTIX_CONFIG.enableSuggestions = value === 'true';
                        break;
                    case 'enablePlaceholders':
                        SEMANTIX_CONFIG.enablePlaceholders = value === 'true';
                        break;
                    case 'placeholderSpeed':
                        SEMANTIX_CONFIG.placeholderSpeed = parseInt(value) || 3000;
                        break;
                }
            });
        });
        
        // Load additional settings from global object if available
        if (window.SEMANTIX_SETTINGS) {
            SEMANTIX_CONFIG = { ...SEMANTIX_CONFIG, ...window.SEMANTIX_SETTINGS };
        }
    }

    // Validate configuration
    function validateConfig() {
        if (!SEMANTIX_CONFIG.siteId) {
            console.error('Semantix Search: site-id is required. Add data-site-id="YOUR_SITE_ID" to the script tag.');
            return false;
        }
        
        if (!SEMANTIX_CONFIG.apiKey) {
            console.warn('Semantix Search: apiKey not provided. Some features may not work.');
        }
        
        if (!SEMANTIX_CONFIG.dbName) {
            console.warn('Semantix Search: dbName not provided. Using default.');
            SEMANTIX_CONFIG.dbName = 'default';
        }
        
        return true;
    }

    // Hide existing search forms
    function hideNativeSearchForms() {
        const selectors = [
            '.search-modal__form',
            '.icon-search',
            '#Search-In-Modal-1',
            '.mobile-nav--search',
            '.mobile-nav__search-button',
            '.site-header__search-container input[type="search"]',
            '.search-bar',
            '.header-search',
            '.main-search',
            'form[action*="search"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style.setProperty('display', 'none', 'important');
            });
        });
    }

    // Create Semantix search form
    function createSemantixSearch() {
        // Find existing search containers
        const searchContainers = document.querySelectorAll([
            '.search-modal__form',
            '.site-header__search-container',
            '.header-search',
            '.main-search',
            '.search-bar',
            'form[action*="search"]'
        ].join(', '));
        
        if (searchContainers.length === 0) {
            console.warn('Semantix Search: No search containers found. Creating default.');
            createDefaultSearchContainer();
            return;
        }
        
        searchContainers.forEach(container => {
            replaceSearchContainer(container);
        });
    }

    // Create default search container if none found
    function createDefaultSearchContainer() {
        const header = document.querySelector('header, .site-header, .header');
        if (!header) {
            console.error('Semantix Search: No header found to place search form.');
            return;
        }
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'semantix-search-container';
        searchContainer.innerHTML = createSearchHTML();
        
        header.appendChild(searchContainer);
    }

    // Replace existing search container
    function replaceSearchContainer(container) {
        const semantixContainer = document.createElement('div');
        semantixContainer.className = 'semantix-search-container';
        semantixContainer.innerHTML = createSearchHTML();
        
        // Preserve original styling classes
        semantixContainer.className += ' ' + container.className;
        
        container.parentNode.replaceChild(semantixContainer, container);
    }

    // Create search HTML
    function createSearchHTML() {
        const themeClass = SEMANTIX_CONFIG.theme === 'dark' ? 'semantix-dark' : '';
        const rtlClass = SEMANTIX_CONFIG.language === 'he' ? 'semantix-rtl' : '';
        
        return `
            <div class="semantix-search-wrapper ${themeClass} ${rtlClass}" data-site-id="${SEMANTIX_CONFIG.siteId}">
                <form class="semantix-search-form" action="/search" method="get">
                    <div class="semantix-search-input-container">
                        <input 
                            type="search" 
                            name="q" 
                            class="semantix-search-input" 
                            placeholder="${SEMANTIX_CONFIG.placeholders[0]}"
                            autocomplete="off"
                            data-site-id="${SEMANTIX_CONFIG.siteId}"
                        />
                        ${SEMANTIX_CONFIG.enablePlaceholders ? '<span class="semantix-dynamic-placeholder"></span>' : ''}
                        <button type="submit" class="semantix-search-button">
                            <img src="${SEMANTIX_CONFIG.searchIcon}" alt="Search" class="semantix-search-icon" />
                        </button>
                    </div>
                    ${SEMANTIX_CONFIG.enableSuggestions ? '<ul class="semantix-suggestions-list"></ul>' : ''}
                </form>
            </div>
        `;
    }

    // Add CSS styles
    function addStyles() {
        if (document.getElementById('semantix-search-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'semantix-search-styles';
        style.textContent = `
            .semantix-search-wrapper {
                position: relative;
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .semantix-search-form {
                position: relative;
                width: 100%;
            }
            
            .semantix-search-input-container {
                position: relative;
                display: flex;
                align-items: center;
                background: #fff;
                border: 2px solid #e1e5e9;
                border-radius: 25px;
                padding: 8px 15px;
                transition: all 0.3s ease;
            }
            
            .semantix-search-input-container:focus-within {
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }
            
            .semantix-search-input {
                flex: 1;
                border: none;
                outline: none;
                background: transparent;
                font-size: 16px;
                padding: 8px 12px;
                color: #333;
            }
            
            .semantix-search-input::placeholder {
                color: #999;
            }
            
            .semantix-dynamic-placeholder {
                position: absolute;
                right: 60px;
                top: 50%;
                transform: translateY(-50%);
                color: #999;
                font-size: 16px;
                pointer-events: none;
                transition: opacity 0.5s ease;
            }
            
            .semantix-search-button {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .semantix-search-icon {
                width: 20px;
                height: 20px;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .semantix-search-button:hover .semantix-search-icon {
                opacity: 1;
            }
            
            .semantix-suggestions-list {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #fff;
                border: 1px solid #e1e5e9;
                border-top: none;
                border-radius: 0 0 15px 15px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .semantix-suggestions-list.show {
                display: block;
            }
            
            .semantix-suggestion-item {
                padding: 12px 15px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s ease;
            }
            
            .semantix-suggestion-item:hover {
                background-color: #f8f9fa;
            }
            
            .semantix-suggestion-item:last-child {
                border-bottom: none;
            }
            
            /* RTL Support */
            .semantix-rtl .semantix-search-input {
                text-align: right;
            }
            
            .semantix-rtl .semantix-dynamic-placeholder {
                right: auto;
                left: 60px;
            }
            
            /* Dark Theme */
            .semantix-dark .semantix-search-input-container {
                background: #2d3748;
                border-color: #4a5568;
            }
            
            .semantix-dark .semantix-search-input {
                color: #e2e8f0;
            }
            
            .semantix-dark .semantix-search-input::placeholder {
                color: #a0aec0;
            }
            
            .semantix-dark .semantix-suggestions-list {
                background: #2d3748;
                border-color: #4a5568;
            }
            
            .semantix-dark .semantix-suggestion-item {
                color: #e2e8f0;
                border-color: #4a5568;
            }
            
            .semantix-dark .semantix-suggestion-item:hover {
                background-color: #4a5568;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Initialize search functionality
    function initializeSearch() {
        const searchInputs = document.querySelectorAll('.semantix-search-input');
        
        searchInputs.forEach(input => {
            // Add event listeners
            input.addEventListener('input', handleSearchInput);
            input.addEventListener('focus', handleSearchFocus);
            input.addEventListener('blur', handleSearchBlur);
            input.addEventListener('keydown', handleSearchKeydown);
        });
        
        // Initialize dynamic placeholders if enabled
        if (SEMANTIX_CONFIG.enablePlaceholders) {
            initializeDynamicPlaceholders();
        }
    }

    // Handle search input
    function handleSearchInput(event) {
        const query = event.target.value.trim();
        const suggestionsList = event.target.parentElement.parentElement.querySelector('.semantix-suggestions-list');
        
        if (query.length < 2) {
            hideSuggestions(suggestionsList);
            return;
        }
        
        // Show loading state
        showSuggestions(suggestionsList, [{ text: 'טוען...', type: 'loading' }]);
        
        // Fetch suggestions
        fetchSuggestions(query)
            .then(suggestions => {
                showSuggestions(suggestionsList, suggestions);
            })
            .catch(error => {
                console.error('Semantix Search Error:', error);
                hideSuggestions(suggestionsList);
            });
    }

    // Fetch suggestions from API
    async function fetchSuggestions(query) {
        const response = await fetch(`${SEMANTIX_CONFIG.apiEndpoint}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(SEMANTIX_CONFIG.apiKey && { 'x-api-key': SEMANTIX_CONFIG.apiKey })
            },
            body: JSON.stringify({
                query: query,
                dbName: SEMANTIX_CONFIG.dbName,
                collectionName1: 'products',
                collectionName2: 'queries'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data.slice(0, 5) : []; // Limit to 5 suggestions
    }

    // Show suggestions
    function showSuggestions(container, suggestions) {
        if (!container) return;
        
        container.innerHTML = suggestions.map(suggestion => {
            if (suggestion.type === 'loading') {
                return `<div class="semantix-suggestion-item">${suggestion.text}</div>`;
            }
            
            return `
                <div class="semantix-suggestion-item" data-url="${suggestion.url || ''}">
                    <div class="suggestion-text">${suggestion.name || suggestion.text}</div>
                    ${suggestion.price ? `<div class="suggestion-price">${suggestion.price} ₪</div>` : ''}
                </div>
            `;
        }).join('');
        
        container.classList.add('show');
        
        // Add click handlers
        container.querySelectorAll('.semantix-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    window.location.href = url;
                } else {
                    // Perform search
                    const form = item.closest('.semantix-search-form');
                    const input = form.querySelector('.semantix-search-input');
                    input.value = item.textContent.trim();
                    form.submit();
                }
            });
        });
    }

    // Hide suggestions
    function hideSuggestions(container) {
        if (container) {
            container.classList.remove('show');
        }
    }

    // Handle search focus
    function handleSearchFocus(event) {
        const suggestionsList = event.target.parentElement.parentElement.querySelector('.semantix-suggestions-list');
        if (suggestionsList && suggestionsList.children.length > 0) {
            suggestionsList.classList.add('show');
        }
    }

    // Handle search blur
    function handleSearchBlur(event) {
        // Delay hiding to allow clicks on suggestions
        setTimeout(() => {
            const suggestionsList = event.target.parentElement.parentElement.querySelector('.semantix-suggestions-list');
            hideSuggestions(suggestionsList);
        }, 200);
    }

    // Handle search keydown
    function handleSearchKeydown(event) {
        const suggestionsList = event.target.parentElement.parentElement.querySelector('.semantix-suggestions-list');
        
        if (event.key === 'Escape') {
            hideSuggestions(suggestionsList);
            event.target.blur();
        }
    }

    // Initialize dynamic placeholders
    function initializeDynamicPlaceholders() {
        const placeholders = document.querySelectorAll('.semantix-dynamic-placeholder');
        
        placeholders.forEach(placeholder => {
            let currentIndex = 0;
            let intervalId = null;
            
            function changePlaceholder() {
                placeholder.classList.add('semantix-fade-out');
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % SEMANTIX_CONFIG.placeholders.length;
                    placeholder.textContent = SEMANTIX_CONFIG.placeholders[currentIndex];
                    placeholder.classList.remove('semantix-fade-out');
                    placeholder.classList.add('semantix-fade-in');
                    setTimeout(() => placeholder.classList.remove('semantix-fade-in'), 500);
                }, 500);
            }
            
            // Start rotation
            placeholder.textContent = SEMANTIX_CONFIG.placeholders[0];
            intervalId = setInterval(changePlaceholder, SEMANTIX_CONFIG.placeholderSpeed);
            
            // Stop rotation on input focus
            const input = placeholder.parentElement.querySelector('.semantix-search-input');
            if (input) {
                input.addEventListener('focus', () => {
                    clearInterval(intervalId);
                    placeholder.style.display = 'none';
                });
                
                input.addEventListener('blur', () => {
                    if (!input.value) {
                        placeholder.style.display = 'block';
                        intervalId = setInterval(changePlaceholder, SEMANTIX_CONFIG.placeholderSpeed);
                    }
                });
            }
        });
    }

    // Main initialization
    function init() {
        console.log('🚀 Initializing Semantix Search CDN...');
        
        // Load configuration
        loadConfigFromScriptTag();
        
        // Validate configuration
        if (!validateConfig()) {
            return;
        }
        
        console.log('✅ Semantix Search Configuration:', SEMANTIX_CONFIG);
        
        // Add styles
        addStyles();
        
        // Hide native search forms
        hideNativeSearchForms();
        
        // Create Semantix search
        createSemantixSearch();
        
        // Initialize search functionality
        initializeSearch();
        
        console.log('✅ Semantix Search initialized successfully!');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for external access
    window.SemantixSearch = {
        config: SEMANTIX_CONFIG,
        init: init,
        version: '1.0.0'
    };

})();
