(function() {
    'use strict';
    
    // Configuration and settings
    let SEMANTIX_CONFIG = {
        apiKey: '',
        dbName: 'manoVino',
        placeholders: [
            "יין אדום לארוחת סטייקים עד 120 ש׳׳ח",
            "יין רוזה שיתאים לארוחת דגים",
            "יין לבן כשר לאוכל אסייאתי"
        ],
        apiEndpoint: 'https://shopifyserver-1.onrender.com',
        searchIcon: 'https://cdn.shopify.com/s/files/1/0911/9701/4333/files/ai-technology.png?v=1735062266'
    };

    // Get settings from data attributes or global settings
    function loadSettings() {
        // Check for global settings first
        if (window.SEMANTIX_SETTINGS) {
            SEMANTIX_CONFIG = { ...SEMANTIX_CONFIG, ...window.SEMANTIX_SETTINGS };
            return;
        }
        
        // Fallback to DOM data attributes
        const container = document.querySelector('[data-semantix-search]');
        if (container) {
            if (container.dataset.apiKey) SEMANTIX_CONFIG.apiKey = container.dataset.apiKey;
            if (container.dataset.dbName) SEMANTIX_CONFIG.dbName = container.dataset.dbName;
            if (container.dataset.placeholder1) SEMANTIX_CONFIG.placeholders[0] = container.dataset.placeholder1;
            if (container.dataset.placeholder2) SEMANTIX_CONFIG.placeholders[1] = container.dataset.placeholder2;
            if (container.dataset.placeholder3) SEMANTIX_CONFIG.placeholders[2] = container.dataset.placeholder3;
        }
    }

    // Hide existing search forms
    function hideNativeSearchForms() {
        const selectors = [
            '.search-modal__form',
            '.icon-search',
            '#Search-In-Modal-1',
            '.mobile-nav--search',
            '.mobile-nav__search-button',
            '.site-header__search-container input[type="search"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style.setProperty('display', 'none', 'important');
            });
        });
    }

    // Create and inject the search bar
    function createSearchBar() {
        // Remove existing search bar if present
        const existing = document.getElementById('semantix-search-bar');
        if (existing) existing.remove();

        const searchBarHTML = `
            <div id="semantix-search-bar" class="semantix-search-container">
                <div class="semantix-search-bar">
                    <label for="semantix-search-input" class="semantix-sr-only">Search Products</label>
                    <span id="semantix-dynamic-placeholder" class="semantix-dynamic-placeholder">${SEMANTIX_CONFIG.placeholders[0]}</span>
                    <input 
                        type="text" 
                        id="semantix-search-input" 
                        class="semantix-search-input"
                        placeholder=""
                        autocomplete="off"
                    />
                    <button 
                        type="button" 
                        id="semantix-search-button" 
                        class="semantix-search-button"
                        aria-label="Search"
                    >
                        <img 
                            src="${SEMANTIX_CONFIG.searchIcon}" 
                            alt="חיפוש" 
                            class="semantix-search-icon"
                        />
                    </button>
                    <ul 
                        id="semantix-suggestions-list" 
                        class="semantix-suggestions-list"
                        role="listbox"
                        aria-label="הצעות חיפוש"
                    ></ul>
                </div>
            </div>
        `;

        // Find the best location to insert the search bar
        const targetSelectors = [
            '.site-header__search-container',
            '.header__icons',
            '.header__search',
            'header .container',
            'header'
        ];

        let targetElement = null;
        for (const selector of targetSelectors) {
            targetElement = document.querySelector(selector);
            if (targetElement) break;
        }

        if (targetElement) {
            targetElement.insertAdjacentHTML('afterbegin', searchBarHTML);
            initializeSearchBar();
        } else {
            console.warn('Semantix Search: Could not find suitable location for search bar');
        }
    }

    // Initialize search bar functionality
    function initializeSearchBar() {
        const input = document.getElementById('semantix-search-input');
        const button = document.getElementById('semantix-search-button');
        const suggestionsList = document.getElementById('semantix-suggestions-list');
        const placeholder = document.getElementById('semantix-dynamic-placeholder');

        if (!input || !button || !suggestionsList || !placeholder) {
            console.error('Semantix Search: Required elements not found');
            return;
        }

        // Search functionality
        function performSearch(query) {
            const searchQuery = query || input.value.trim();
            if (!searchQuery) {
                alert('אנא הכנס שאילתת חיפוש.');
                return;
            }
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }

        // Event listeners
        button.addEventListener('click', () => performSearch());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });

        // Dynamic placeholder rotation
        let placeholderIndex = 1;
        let placeholderInterval = setInterval(() => {
            placeholder.classList.add('fade-out');
            setTimeout(() => {
                placeholder.textContent = SEMANTIX_CONFIG.placeholders[placeholderIndex];
                placeholder.classList.remove('fade-out');
                placeholder.classList.add('fade-in');
                placeholderIndex = (placeholderIndex + 1) % SEMANTIX_CONFIG.placeholders.length;
                setTimeout(() => placeholder.classList.remove('fade-in'), 500);
            }, 250);
        }, 3000);

        // Hide placeholder when typing
        input.addEventListener('input', () => {
            if (input.value.trim().length > 0) {
                placeholder.classList.add('fade-out');
                clearInterval(placeholderInterval);
            } else {
                placeholder.classList.remove('fade-out');
                placeholderInterval = setInterval(() => {
                    placeholder.classList.add('fade-out');
                    setTimeout(() => {
                        placeholder.textContent = SEMANTIX_CONFIG.placeholders[placeholderIndex];
                        placeholder.classList.remove('fade-out');
                        placeholder.classList.add('fade-in');
                        placeholderIndex = (placeholderIndex + 1) % SEMANTIX_CONFIG.placeholders.length;
                        setTimeout(() => placeholder.classList.remove('fade-in'), 500);
                    }, 250);
                }, 3000);
            }
        });

        // Autocomplete functionality
        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func(...args), delay);
            };
        };

        async function fetchSuggestions(query) {
            try {
                const headers = {};
                if (SEMANTIX_CONFIG.apiKey) {
                    headers['Authorization'] = `Bearer ${SEMANTIX_CONFIG.apiKey}`;
                }

                const url = `${SEMANTIX_CONFIG.apiEndpoint}/autocomplete?dbName=${encodeURIComponent(SEMANTIX_CONFIG.dbName)}&collectionName1=products&collectionName2=queries&query=${encodeURIComponent(query)}`;
                
                const response = await fetch(url, { headers });
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();
                displaySuggestions(data);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
                suggestionsList.style.display = 'none';
            }
        }

        function displaySuggestions(suggestions) {
            suggestionsList.innerHTML = '';
            
            if (!suggestions || suggestions.length === 0) {
                suggestionsList.style.display = 'none';
                return;
            }

            suggestionsList.style.display = 'block';
            
            suggestions.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'semantix-suggestion-item';
                li.setAttribute('role', 'option');
                li.setAttribute('tabindex', '0');
                
                li.innerHTML = `
                    ${item.image ? `<img src="${item.image}" class="semantix-suggestion-image" alt="${item.suggestion}" loading="lazy" />` : ''}
                    <span class="semantix-suggestion-text">${item.suggestion}</span>
                `;
                
                li.addEventListener('click', () => performSearch(item.suggestion));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') performSearch(item.suggestion);
                });
                
                suggestionsList.appendChild(li);
            });
        }

        const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length > 1) {
                debouncedFetchSuggestions(value);
            } else {
                suggestionsList.style.display = 'none';
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#semantix-search-bar')) {
                suggestionsList.style.display = 'none';
            }
        });

        // Keyboard navigation for suggestions
        input.addEventListener('keydown', (e) => {
            const items = suggestionsList.querySelectorAll('.semantix-suggestion-item');
            const currentFocus = suggestionsList.querySelector('.semantix-suggestion-item:focus');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentFocus) {
                    const nextItem = currentFocus.nextElementSibling;
                    if (nextItem) nextItem.focus();
                } else if (items.length > 0) {
                    items[0].focus();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentFocus) {
                    const prevItem = currentFocus.previousElementSibling;
                    if (prevItem) prevItem.focus();
                } else if (items.length > 0) {
                    items[items.length - 1].focus();
                }
            }
        });
    }

    // Initialize everything
    function initializeSemanticSearch() {
        loadSettings();
        hideNativeSearchForms();
        createSearchBar();
    }

    // Run on different events to ensure compatibility
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSemanticSearch);
    } else {
        initializeSemanticSearch();
    }

    // Re-initialize on Shopify section events (theme editor compatibility)
    document.addEventListener('shopify:section:load', initializeSemanticSearch);
    document.addEventListener('shopify:section:reorder', initializeSemanticSearch);

    // Watch for theme changes with MutationObserver
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                !document.getElementById('semantix-search-bar')) {
                initializeSemanticSearch();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Expose global function for programmatic search
    window.semantixSearch = {
        performSearch: (query) => {
            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        },
        updateSettings: (newSettings) => {
            SEMANTIX_CONFIG = { ...SEMANTIX_CONFIG, ...newSettings };
            initializeSemanticSearch();
        }
    };

})();