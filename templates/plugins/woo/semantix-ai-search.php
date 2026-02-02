<?php
/**
 * Plugin Name: Semantix AI Search
 * Description: Automatically replaces WooCommerce and WordPress default search bars with Semantix AI search bar, keeping shortcode and widget features intact.
 * Version: 1.6.13
 * Author: Semantix
 * License: GPL2
 */

// Exit if accessed directly to prevent direct file access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Add global JavaScript settings for the Semantix search bar
 * This makes search placeholders and settings available globally
 */
add_action('wp_enqueue_scripts', function(){
    wp_enqueue_style(
        'semantix-override',
        plugin_dir_url(__FILE__) . 'assets/css/admin.css',
        [],                                    // no deps
        filemtime( plugin_dir_path(__FILE__) . 'assets/css/admin.css' )
    );
}, 999);  // priority 999 ensures it's last

if (!function_exists('semantix_dequeue_cart_fragments')) {
    function semantix_dequeue_cart_fragments() {
        if (is_front_page() || is_single() || is_archive()) {
            wp_dequeue_script('wc-cart-fragments');
        }
    }
}
add_action('wp_enqueue_scripts', 'semantix_dequeue_cart_fragments', 20);

// Auto-disable FiboSearch (DGWT WCAS) when Semantix is active
if (!function_exists('semantix_disable_fibosearch')) {
    function semantix_disable_fibosearch() {
        // Check if auto-disable is enabled (default: true)
        $auto_disable = get_option('semantix_auto_disable_fibosearch', true);
        if (!$auto_disable) {
            return; // Don't disable if setting is turned off
        }
        
        // Check if FiboSearch is active
        if (class_exists('DgotwWcasAjaxSearch') || function_exists('dgwt_wcas_init')) {
            // Disable FiboSearch JavaScript
            add_action('wp_enqueue_scripts', function() {
                wp_dequeue_script('dgwt-wcas-scripts');
                wp_dequeue_script('dgwt-wcas-ajax-search');
                wp_dequeue_script('dgwt_wcas');
                wp_dequeue_script('dgwt-wcas');
                wp_dequeue_style('dgwt-wcas-style');
                wp_dequeue_style('dgwt-wcas-css');
            }, 999);
            
            // Remove FiboSearch hooks and filters (more targeted approach)
            add_action('init', function() {
                // Only disable FiboSearch AJAX handlers, not all AJAX
                remove_action('wp_ajax_dgwt_wcas_ajax_search', 'dgwt_wcas_ajax_search_action');
                remove_action('wp_ajax_nopriv_dgwt_wcas_ajax_search', 'dgwt_wcas_ajax_search_action');
                
                // Disable FiboSearch shortcode
                remove_shortcode('wcas-search-form');
                
                // Override FiboSearch settings to disable it
                add_filter('dgwt/wcas/settings', function($settings) {
                    $settings['enable_search'] = false;
                    $settings['enable_submit_button'] = false;
                    $settings['enable_ajax_search'] = false;
                    return $settings;
                });
                
                // Disable FiboSearch widgets
                add_action('widgets_init', function() {
                    unregister_widget('DGWT_WCAS_Search_Widget');
                }, 11);
            }, 0);
            
            // Add CSS to hide FiboSearch elements
            add_action('wp_head', function() {
                echo '<style>
                    /* Hide FiboSearch elements */
                    .dgwt-wcas-search-wrapp,
                    .dgwt-wcas-sf-wrapp,
                    .dgwt-wcas-search-form,
                    .dgwt-wcas-suggestions-wrapp,
                    .dgwt-wcas-preloader,
                    .js-dgwt-wcas-enable-mobile-form {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    /* Override FiboSearch search inputs */
                    input.dgwt-wcas-search-input {
                        display: none !important;
                    }
                </style>';
            });
            
            // Add JavaScript to disable FiboSearch functionality (only on search pages)
            add_action('wp_footer', function() {
                if (!is_search()) return; // Only run on search pages
                ?>
                <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // Only disable FiboSearch on search pages to avoid interfering with AJAX
                    if (typeof DgwtWcasAjaxSearch !== 'undefined') {
                        console.log('Semantix: Auto-disabling FiboSearch on search page to prevent conflicts');
                        
                        // Only hide FiboSearch search inputs, don't touch AJAX functionality
                        document.querySelectorAll('.dgwt-wcas-search-input, input[name="dgwt_wcas"]').forEach(function(input) {
                            input.style.display = 'none';
                            input.disabled = true;
                        });
                        
                        // Hide FiboSearch suggestion containers
                        document.querySelectorAll('.dgwt-wcas-suggestions-wrapp, .dgwt-wcas-preloader').forEach(function(el) {
                            el.style.display = 'none';
                            el.style.visibility = 'hidden';
                        });
                    }
                });
                </script>
                <?php
            }, 999);
        }
    }
}
add_action('plugins_loaded', 'semantix_disable_fibosearch', 1);

// Add admin notice when FiboSearch is being auto-disabled
if (!function_exists('semantix_fibosearch_notice')) {
    function semantix_fibosearch_notice() {
        $auto_disable = get_option('semantix_auto_disable_fibosearch', true);
        
        if ($auto_disable && (class_exists('DgotwWcasAjaxSearch') || function_exists('dgwt_wcas_init'))) {
            $screen = get_current_screen();
            if ($screen && in_array($screen->id, ['plugins', 'dashboard', 'toplevel_page_semantix-ai-search'])) {
                ?>
                <div class="notice notice-info is-dismissible">
                    <p>
                        <strong><?php esc_html_e('Semantix AI Search:', 'semantix-ai-search'); ?></strong>
                        <?php esc_html_e('FiboSearch (AJAX Search for WooCommerce) is being automatically disabled to prevent conflicts.', 'semantix-ai-search'); ?>
                        <a href="<?php echo admin_url('admin.php?page=semantix-ai-search&tab=advanced'); ?>">
                            <?php esc_html_e('Change this setting', 'semantix-ai-search'); ?>
                        </a>
                    </p>
                </div>
                <?php
            }
        }
    }
}
add_action('admin_notices', 'semantix_fibosearch_notice');

if (!function_exists('semantix_add_global_styles_and_scripts')) {
    function semantix_add_global_styles_and_scripts() {
    ?>
    <style>
    /* Styles for Suggestions and Placeholders */
    .semantix-search-wrapper {
        position: relative;
        direction: rtl; /* Ensure container respects RTL */
    }

    .semantix-search-wrapper .search-field,
    .semantix-search-wrapper .semantix-search-input { /* Target both our own and native inputs */
        position: relative;
        background-color: transparent !important;
        z-index: 2; /* Input field should be on top of the placeholder */
    }

    .semantix-dynamic-placeholder {
        position: absolute;
        top: 50%;
        right: 15px; /* Adjust for padding in typical search bars */
        transform: translateY(-50%);
        font-size: 1em; /* Inherit font size from parent */
        color: #777;
        pointer-events: none;
        transition: opacity 0.5s ease-in-out;
        z-index: 1; /* Placeholder is behind the input field text */
    }

    /* Hide dynamic placeholders on mobile devices */
    @media (max-width: 768px) {
        .semantix-dynamic-placeholder {
            display: none !important;
        }
    }

    .semantix-fade-in { opacity: 1; }
    .semantix-fade-out { opacity: 0; }

    .semantix-suggestions-list {
        position: absolute !important;
        top: 100% !important;
        left: 0 !important;
        right: 0 !important;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        width: 100%;
        max-height: 350px;
        overflow-y: auto;
        z-index: 99999; /* High z-index to appear over other content */
        display: none;
        list-style: none;
        padding: 0;
        margin-top: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        text-align: right; /* RTL text alignment */
    }

    .semantix-suggestions-list.show { display: block; }

    .semantix-suggestion-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .semantix-suggestion-item:hover { background-color: #f0f0f0; }

    .semantix-suggestion-image {
        width: 45px;
        height: 45px;
        object-fit: cover;
        border-radius: 4px;
    }

    .semantix-suggestion-text {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        color: #333;
    }

    .semantix-suggestion-price {
        font-size: 14px;
        color: #100f0f;
        display: block;
        margin-top: 2px;
    }

    .semantix-text-quotation {
        font-style: italic;
        font-size: 12px;
        color: #777;
        margin-top: 4px;
        display: block;
    }
    </style>
    <?php
}
}
add_action('wp_head', 'semantix_add_global_styles_and_scripts', 5);

if (!function_exists('semantix_add_admin_settings_js')) {
function semantix_add_admin_settings_js() {
    // Get placeholders from options, defaulting to a sample text if not set
    $placeholders = get_option('semantix_placeholders', 'יין אדום צרפתי, פירותי וקליל');

    // Convert newlines to commas for proper formatting
    if (strpos($placeholders, "\n") !== false) {
        $placeholder_lines = explode("\n", $placeholders);
        $placeholder_lines = array_map('trim', $placeholder_lines);
        $placeholders = implode(', ', $placeholder_lines);
    }

    // Convert to array and get placeholder rotation speed setting
    $placeholder_array = array_filter(array_map('trim', explode(',', $placeholders)));
    $placeholder_speed = get_option('semantix_placeholder_speed', 3000);
    $enable_suggestions = get_option('semantix_enable_suggestions', 1);

    // Create JSON version for JavaScript
    $placeholders_json = wp_json_encode(array_values($placeholder_array));

    ?>
    <script>
    // Global settings for Semantix AI Search
    window.semantixPlaceholders = <?php echo $placeholders_json; ?>;
    window.semantixPlaceholderSpeed = <?php echo intval($placeholder_speed); ?>;
    window.semantixEnableSuggestions = <?php echo intval($enable_suggestions); ?>;

    // Override the placeholder function with one that uses our settings
    document.addEventListener('DOMContentLoaded', function() {
        // Add data attributes to all search bars to ensure settings are available
        document.querySelectorAll('.semantix-search-bar').forEach(function(searchBar) {
            if (!searchBar.dataset.placeholders) {
                searchBar.dataset.placeholders = JSON.stringify(window.semantixPlaceholders);
            }
            if (!searchBar.dataset.rotationSpeed) {
                searchBar.dataset.rotationSpeed = window.semantixPlaceholderSpeed;
            }
        });
    });
    </script>
    <?php
    }
}
// Hook into wp_head to add our JavaScript settings early
add_action('wp_head', 'semantix_add_admin_settings_js', 5);

/**
 * Automatically enhance all search forms with Semantix AI search
 * This is added to the footer to ensure all search forms are processed
 */
add_action('wp_footer', 'semantix_enhance_search_forms');

/**
 * Function to enhance standard search forms with Semantix features
 * Uses JavaScript to find and augment forms in the DOM
 */
if (!function_exists('semantix_enhance_search_forms')) {
    function semantix_enhance_search_forms() {
    ?>
<script>
// Make sure all functions are in the global scope
// Function to handle search input and show/hide suggestions
window.semantix_handleSearchInput = function(event) {
    const query = event.target.value.trim();
    const searchWrapper = event.target.closest('.semantix-search-wrapper');
    if (!searchWrapper) return;

    const suggestionsDropdown = searchWrapper.querySelector('.semantix-suggestions-list');

    if (query.length > 1) {
        if (suggestionsDropdown) {
            window.semantix_debouncedFetchSuggestions(query, suggestionsDropdown);
            suggestionsDropdown.style.display = "block";
        }
    } else {
        if (suggestionsDropdown) {
            suggestionsDropdown.style.display = "none";
        }
    }
};

// Function to execute search - redirects to WordPress search results page
window.semantix_performSearch = function(inputElement, searchQuery = null) {
    const query = searchQuery || inputElement.value.trim();
    if (!query) {
        alert("אנא הכנס שאילתת חיפוש.");
        return;
    }
    // Find the parent form and submit it, or redirect as a fallback
    const parentForm = inputElement.closest('form');
    if (parentForm) {
        // Update the input value before submitting
        inputElement.value = query;
        parentForm.submit();
    } else {
    window.location.href = "/?s=" + encodeURIComponent(query);
    }
};

// Function to detect if device is mobile
window.semantix_isMobile = function() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Function to handle rotating placeholders in the search bar
window.semantix_changePlaceholder = function(searchWrapper) {
    const searchInput = searchWrapper.querySelector('input[type="search"], input[type="text"][name="s"], .search-field, .semantix-search-input');
    const dynamicPlaceholder = searchWrapper.querySelector('.semantix-dynamic-placeholder');
    if (!dynamicPlaceholder || !searchInput) return;

    // Check if mobile - if so, hide dynamic placeholder and restore original
    if (window.semantix_isMobile()) {
        dynamicPlaceholder.style.display = 'none';
        // Restore original placeholder if it was stored
        const originalPlaceholder = searchInput.dataset.originalPlaceholder;
        if (originalPlaceholder) {
            searchInput.setAttribute('placeholder', originalPlaceholder);
        }
        return;
    }

    let currentIndex = 0;
    let intervalId = null;

    let dynamicTexts;
    try {
        const placeholderData = searchWrapper.dataset.placeholders || searchInput.dataset.placeholders || '[]';
        dynamicTexts = JSON.parse(placeholderData);
         if (!Array.isArray(dynamicTexts) || dynamicTexts.length === 0) {
            dynamicTexts = window.semantixPlaceholders || [];
        }
    } catch (e) {
        console.error('Error parsing placeholders:', e);
        dynamicTexts = window.semantixPlaceholders || ['יין אדום צרפתי', 'פירותי וקליל'];
    }

    const rotationSpeed = searchWrapper.dataset.rotationSpeed || searchInput.dataset.rotationSpeed || 3000;

    if (dynamicTexts.length === 0) {
        dynamicPlaceholder.style.display = 'none';
        return;
    }

    // Store original placeholder before clearing it
    if (!searchInput.dataset.originalPlaceholder) {
        searchInput.dataset.originalPlaceholder = searchInput.getAttribute('placeholder') || '';
    }
    
    dynamicPlaceholder.textContent = dynamicTexts[0];
    searchInput.setAttribute('placeholder', ''); // Clear native placeholder

    function changePlaceholder() {
        dynamicPlaceholder.classList.add("semantix-fade-out");
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % dynamicTexts.length;
            dynamicPlaceholder.textContent = dynamicTexts[currentIndex];
            dynamicPlaceholder.classList.remove("semantix-fade-out");
            dynamicPlaceholder.classList.add("semantix-fade-in");
            setTimeout(() => dynamicPlaceholder.classList.remove("semantix-fade-in"), 500);
        }, 500);
    }

    intervalId = setInterval(changePlaceholder, parseInt(rotationSpeed));

    const managePlaceholderVisibility = () => {
    if (searchInput.value.trim().length > 0) {
        dynamicPlaceholder.style.display = 'none';
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        } else {
            dynamicPlaceholder.style.display = 'block';
            if (!intervalId && dynamicTexts.length > 1) {
                intervalId = setInterval(changePlaceholder, parseInt(rotationSpeed));
            }
        }
    };

    searchInput.addEventListener('input', managePlaceholderVisibility);
    searchInput.addEventListener('focus', managePlaceholderVisibility);
    searchInput.addEventListener('blur', managePlaceholderVisibility);
    managePlaceholderVisibility(); // Initial check

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            window.semantix_performSearch(this);
        }
    });

    searchWrapper.dataset.placeholderIntervalId = intervalId;
};

// Global debounce function to limit API calls during typing
window.semantix_debounce = function(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
};

// Function to fetch search suggestions from API (this will be overridden by the footer script for latest settings)
// This version is a fallback. The one in wp_footer is preferred.
async function semantix_fetchSuggestions_fallback(query, ulEl){
  const dbNameFallback = "<?php echo esc_js(get_option('semantix_dbname', 'alcohome')); ?>"; // Fallback DB name
  const apiKeyFallback = "<?php echo esc_js(get_option('semantix_api_key', '')); ?>"; // Fallback API key
  const searchHostFallback = "https://dashboard-server-ae00.onrender.com"; // Fallback host
  const autocompletePath = "/autocomplete"; // Autocomplete path

  const url = `${searchHostFallback}${autocompletePath}` +
              `?dbName=${dbNameFallback}&collectionName1=products` + // Assuming default collections
              `&collectionName2=queries&query=${encodeURIComponent(query)}`;

  try{
    const headers = {};
    if(apiKeyFallback) headers['x-api-key'] = apiKeyFallback;
    const res = await fetch(url,{headers: headers});
    if(!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    semantix_displaySuggestions(data, ulEl);
  }catch(err){ console.error('[Semantix Fallback] suggestions error:',err); }
}

// Initialize debounced fetch with fallback (will be updated by footer script)
window.semantix_debouncedFetchSuggestions = window.semantix_debounce(semantix_fetchSuggestions_fallback, 200);


// Function to display fetched suggestions in the dropdown
window.semantix_displaySuggestions = function(suggestions, suggestionsDropdown) {
    if (!suggestionsDropdown) {
        console.error("Suggestions dropdown is null.");
        return;
    }

    // Clear previous suggestions
    suggestionsDropdown.innerHTML = "";

    if (suggestions.length > 0) {
        // Make the dropdown visible
        suggestionsDropdown.style.display = "block";

        suggestions.forEach((suggestion) => {
            // Create a new list item for each suggestion
            const li = document.createElement("li");
            li.classList.add("semantix-suggestion-item");

            // Build the inner HTML
            li.innerHTML = `
                ${suggestion.image ? `<img src="${suggestion.image}" alt="${suggestion.suggestion}" class="semantix-suggestion-image">` : ""}
                <div class="semantix-suggestion-text">
                    <span class="suggestion-title">${suggestion.suggestion}</span>
                    ${
                        suggestion.source === "products"
                            ? `<span class="semantix-suggestion-price">${suggestion.price} ₪</span>`
                            : `<span class="semantix-text-quotation">גולשים חיפשו</span>`
                    }
                </div>
            `;

            // Attach a click event to perform the search with the selected suggestion
            li.onclick = () => {
                
                const searchWrapper = suggestionsDropdown.closest('.semantix-search-wrapper');
                const searchInput = searchWrapper.querySelector('.search-field, .semantix-search-input');
                searchInput.value = suggestion.suggestion;
                window.semantix_performSearch(searchInput, suggestion.suggestion);
                if(suggestion.source === "products"){
                    window.location.href = suggestion.url;
                }
            };

            suggestionsDropdown.appendChild(li);
        });
    } else {
        // Hide the dropdown if there are no suggestions
        suggestionsDropdown.style.display = "none";
    }
};

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOMContentLoaded - Initializing Semantix search enhancements");

    const defaultSelectors = [
        '.widget_search',
        '.widget_product_search',
        'form[role="search"]',
        '.elementor-widget-search-form'
    ];

    let customSelectorsFromPHP = [];
    <?php if (!empty($custom_selectors_js_array_items)): ?>
    customSelectorsFromPHP = [<?php echo $custom_selectors_js_array_items; ?>];
    <?php endif; ?>

    const selectorsToEnhance = [
        ...defaultSelectors,
        ...customSelectorsFromPHP
    ];

    console.log('Semantix - Selectors targeted for enhancement:', selectorsToEnhance);

    selectorsToEnhance.forEach(selector => {
        if (!selector || typeof selector !== 'string' || selector.trim() === '') return;
        try {
            document.querySelectorAll(selector).forEach(targetElement => {
                const searchInput = targetElement.querySelector('input[type="search"], input[type="text"][name="s"]');
                if (!searchInput) return;

                let wrapper = searchInput.closest('.semantix-search-wrapper');

                // If not already wrapped, let's wrap it.
                if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'semantix-search-wrapper';
                    
                    // Wrap the input field
                    if(searchInput.parentNode) {
                        searchInput.parentNode.insertBefore(wrapper, searchInput);
                    }
                    wrapper.appendChild(searchInput);

                    // Add placeholder and suggestions list to the wrapper
                    let elementsToInsert = '<span class="semantix-dynamic-placeholder"></span>';
                    if (typeof window.semantixEnableSuggestions === 'undefined' || window.semantixEnableSuggestions) {
                        elementsToInsert += '<ul class="semantix-suggestions-list"></ul>';
                    }
                    wrapper.insertAdjacentHTML('beforeend', elementsToInsert);
                    
                    // Copy data attributes from container to wrapper if they exist
                    const container = targetElement.closest('[data-placeholders]');
                    if (container) {
                        wrapper.dataset.placeholders = container.dataset.placeholders;
                        wrapper.dataset.rotationSpeed = container.dataset.rotationSpeed;
                    }
                }

                // Add resize listener to handle mobile/desktop switching
                const handleResize = () => {
                    if (window.semantix_changePlaceholder) {
                        window.semantix_changePlaceholder(wrapper);
                    }
                };
                
                // Add resize listener (throttled)
                let resizeTimeout;
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(handleResize, 250);
                });

                if (!wrapper.dataset.semantixInitialized) {
                     wrapper.dataset.semantixInitialized = 'true';
                     if (typeof window.semantixEnableSuggestions === 'undefined' || window.semantixEnableSuggestions) {
                        searchInput.setAttribute('oninput', 'semantix_handleSearchInput(event)');
                     }
                     window.semantix_changePlaceholder(wrapper);
                     console.log('Semantix - Enhanced search input in:', targetElement);
                }
            });
        } catch (e) {
            console.error('Semantix - Invalid selector or error during enhancement for selector "' + selector + '":', e);
        }
    });

    // Close suggestions when clicking outside
     document.addEventListener('click', function(event) {
        document.querySelectorAll('.semantix-suggestions-list').forEach(function(suggestionsDropdown) {
            if (suggestionsDropdown.style.display === "block" &&
                !suggestionsDropdown.closest('.semantix-search-wrapper').contains(event.target)) {
                suggestionsDropdown.style.display = "none";
            }
        });
    });
});
</script>

    <?php
}
}

/**
 * This filter overrides WordPress get_search_form() function output.
 */
$GLOBALS['semantix_is_rendering_shortcode'] = false;
if (get_option('semantix_enable_auto_replace', 1)) {
add_filter('get_search_form', 'semantix_replace_wp_search_form');
}

if (!function_exists('semantix_replace_wp_search_form')) {
function semantix_replace_wp_search_form($form) {
    // If we are already rendering our shortcode, return the form as-is to prevent a loop.
    if (!empty($GLOBALS['semantix_is_rendering_shortcode'])) {
        return $form;
    }
    // Return a simplified shortcode that will be enhanced by JS
    return do_shortcode('[semantix_search_bar]');
    }
}

/**
 * Main shortcode function for the Semantix search bar
 * This generates a standard search form container with data attributes for JS enhancement.
 */
if (!function_exists('semantix_search_bar_shortcode')) {
function semantix_search_bar_shortcode( $atts ) {
    // Get placeholder data from attributes, which will be populated by the defaults filter.
    $atts = shortcode_atts( array(
        'placeholders'      => '',
        'placeholder_speed' => 3000,
    ), $atts, 'semantix_search_bar' );

    $placeholders_str = sanitize_text_field( $atts['placeholders'] );
    $placeholder_speed = absint($atts['placeholder_speed']);

    $placeholders_arr = array_filter( array_map( 'trim', explode( ',', $placeholders_str ) ) );
    $placeholders_json = wp_json_encode( array_values( $placeholders_arr ) );

    // Set a flag to prevent infinite loops with the get_search_form filter.
    $GLOBALS['semantix_is_rendering_shortcode'] = true;

    // We create a container with data attributes, and inside it, a standard WP search form.
    // The main script `semantix_enhance_search_forms` will find this form and enhance it.
    ob_start();
    ?>
    <div class="semantix-search-container"
         data-placeholders='<?php echo esc_attr($placeholders_json); ?>'
         data-rotation-speed="<?php echo esc_attr($placeholder_speed); ?>">
        <?php get_search_form(); ?>
    </div>
    <?php
    
    // Unset the flag.
    $GLOBALS['semantix_is_rendering_shortcode'] = false;

    return ob_get_clean();
    }
}
add_shortcode( 'semantix_search_bar', 'semantix_search_bar_shortcode' );


/**
 * Create a widget to render the custom search bar with customizable design.
 */
if (!class_exists('Semantix_Custom_Search_Widget')) {
class Semantix_Custom_Search_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'semantix_custom_search_widget',
            __( 'Semantix AI Search Bar', 'semantix-ai-search' ),
            array( 'description' => __( 'A search bar enhanced with Semantix AI autocomplete and dynamic placeholders.', 'semantix-ai-search' ) )
        );
    }

    public function widget( $args, $instance ) {
        echo $args['before_widget'];
        if ( ! empty( $instance['title'] ) ) {
            echo $args['before_title'] . apply_filters( 'widget_title', $instance['title'] ) . $args['after_title'];
        }

        // The widget now simply outputs the shortcode, which in turn outputs a standard
        // search form that will be enhanced by the plugin's JavaScript.
        $shortcode_atts = array();
        if ( ! empty( $instance['placeholders'] ) ) {
            $placeholders = implode( ',', array_map( 'trim', explode( "\n", $instance['placeholders'] ) ) );
            $shortcode_atts['placeholders'] = sanitize_text_field( $placeholders );
        }
         if ( ! empty( $instance['placeholder_speed'] ) ) $shortcode_atts['placeholder_speed'] = absint( $instance['placeholder_speed'] );


        $shortcode = '[semantix_search_bar';
        foreach ( $shortcode_atts as $key => $value ) {
            $shortcode .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
        }
        $shortcode .= ']';
        echo do_shortcode( $shortcode );
        echo $args['after_widget'];
    }

    public function form( $instance ) {
        $title = ! empty( $instance['title'] ) ? $instance['title'] : __( 'Search', 'semantix-ai-search' );
        $placeholders = ! empty( $instance['placeholders'] ) ? $instance['placeholders'] : "יין אדום צרפתי, פירותי וקליל";
        $placeholder_speed = ! empty( $instance['placeholder_speed'] ) ? $instance['placeholder_speed'] : 3000;
        ?>
        <p><label for="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>"><?php _e( 'Title:', 'semantix-ai-search' ); ?></label> <input class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'title' ) ); ?>" type="text" value="<?php echo esc_attr( $title ); ?>"></p>
        <p><label for="<?php echo esc_attr( $this->get_field_id( 'placeholders' ) ); ?>"><?php _e( 'Dynamic Placeholders (one per line):', 'semantix-ai-search' ); ?></label> <textarea class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'placeholders' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'placeholders' ) ); ?>" rows="3" placeholder="e.g., יין אדום צרפתי..."><?php echo esc_textarea( $placeholders ); ?></textarea></p>
        <p><label for="<?php echo esc_attr( $this->get_field_id( 'placeholder_speed' ) ); ?>"><?php _e( 'Placeholder Speed (ms):', 'semantix-ai-search' ); ?></label> <input class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'placeholder_speed' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'placeholder_speed' ) ); ?>" type="number" value="<?php echo esc_attr( $placeholder_speed ); ?>" min="1000" step="100"></p>
        <?php
    }

    public function update( $new_instance, $old_instance ) {
        $instance = array();
        $instance['title']           = ( ! empty( $new_instance['title'] ) ) ? strip_tags( $new_instance['title'] ) : '';
        $instance['placeholders']    = ( ! empty( $new_instance['placeholders'] ) ) ? sanitize_textarea_field( $new_instance['placeholders'] ) : "יין אדום צרפתי, פירותי וקליל";
        $instance['placeholder_speed'] = ( ! empty( $new_instance['placeholder_speed'] ) ) ? absint( $new_instance['placeholder_speed'] ) : 3000;
        return $instance;
    }
    }
}

if (!function_exists('semantix_register_custom_search_widget')) {
function semantix_register_custom_search_widget() {
    register_widget( 'Semantix_Custom_Search_Widget' );
    }
}
add_action( 'widgets_init', 'semantix_register_custom_search_widget' );

// remove_filter( 'template_include', 'semantix_custom_search_template', 99 ); // This was the old filter
/**
 * Fetch AI search results from Semantix API (Server-Side)
 */
if (!function_exists('semantix_fetch_ai_results_server_side')) {
    function semantix_fetch_ai_results_server_side( $query ) {
        if ( empty( $query ) ) {
            return array(
                'products' => array(),
                'pagination' => array(),
                'metadata' => array()
            );
        }
    
        // Get API settings
        $api_url = rtrim( get_option( 'semantix_search_api_endpoint', 'https://api.semantix-ai.com/search' ), '/' );
        if ( substr( $api_url, -7 ) !== '/search' ) {
            $api_url .= '/search';
        }
        
        $api_key = get_option( 'semantix_api_key', '' );
        $dbname  = get_option( 'semantix_dbname', 'alcohome' );
        $c1      = get_option( 'semantix_collection1', 'products' );
        $c2      = get_option( 'semantix_collection2', 'queries' );
    
        // Check cache first (5 minutes)
        $cache_key = 'semantix_ssr_modern_' . md5( $query . $dbname );
        $cached = get_transient( $cache_key );
        if ( $cached !== false ) {
            error_log( 'Semantix SSR: Using cached results for: ' . $query );
            return $cached;
        }
    
        // Call Semantix API with modern mode
        $response = wp_remote_post( $api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'x-api-key'    => $api_key,
            ),
            'body'    => wp_json_encode( array(
                'query'           => $query,
                'dbName'          => $dbname,
                'collectionName1' => $c1,
                'collectionName2' => $c2,
                'modern'          => true, // ✅ Enable modern mode
            ) ),
            'timeout' => 15,
            'sslverify' => true,
        ) );
    
        // Handle errors
        if ( is_wp_error( $response ) ) {
            error_log( 'Semantix SSR API Error: ' . $response->get_error_message() );
            return array( 'products' => array(), 'pagination' => array(), 'metadata' => array() );
        }
    
        $status_code = wp_remote_retrieve_response_code( $response );
        if ( $status_code !== 200 ) {
            error_log( 'Semantix SSR API returned status: ' . $status_code );
            return array( 'products' => array(), 'pagination' => array(), 'metadata' => array() );
        }
    
        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );
    
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            error_log( 'Semantix SSR JSON decode error: ' . json_last_error_msg() );
            return array( 'products' => array(), 'pagination' => array(), 'metadata' => array() );
        }
    
        // 🎯 Handle modern response structure
        $result = array(
            'products' => array(),
            'pagination' => array(),
            'metadata' => array()
        );
    
        // Modern mode response structure
        if ( isset( $data['products'] ) && is_array( $data['products'] ) ) {
            $result['products'] = $data['products'];
            
            // Store pagination info
            if ( isset( $data['pagination'] ) ) {
                $result['pagination'] = $data['pagination'];
            }
            
            // Store metadata
            if ( isset( $data['metadata'] ) ) {
                $result['metadata'] = $data['metadata'];
            }
        } 
        // Fallback for legacy response (just array of products)
        elseif ( is_array( $data ) ) {
            $result['products'] = $data;
        }
    
        // Cache for 5 minutes
        if ( ! empty( $result['products'] ) ) {
            set_transient( $cache_key, $result, 5 * MINUTE_IN_SECONDS );
        }
    
        return $result;
    }
    }

/**
 * SILENT OVERRIDE: Use Semantix AI for ALL searches (not just zero results)
 * This ensures every search is powered by AI, providing better results
 */
add_action( 'pre_get_posts', 'semantix_smart_fallback_search', 999 );

if (!function_exists('semantix_smart_fallback_search')) {
function semantix_smart_fallback_search( $query ) {
    // Only run on main query, search pages, not admin
    if ( ! $query->is_main_query() || ! $query->is_search() || is_admin() ) {
        return;
    }
    
    // Check if this is a product search
    $post_type = $query->get( 'post_type' );
    if ( $post_type !== 'product' && ! is_array( $post_type ) ) {
        return;
    }
    
    // Get the search term
    $search_query = $query->get( 's' );
    if ( empty( $search_query ) ) {
        return;
    }
    
    // 🎯 SILENT OVERRIDE: ALWAYS use AI (no test query needed)
    // This makes EVERY search powered by Semantix AI
    error_log( '🔍 Semantix Silent Override: Using AI for search: ' . $search_query );
    
    // Get AI results directly (modern mode)
    $ai_response = semantix_fetch_ai_results_server_side( $search_query );
    
    // Extract products from modern response
    $ai_products = isset( $ai_response['products'] ) ? $ai_response['products'] : array();
    $pagination = isset( $ai_response['pagination'] ) ? $ai_response['pagination'] : array();
    $metadata = isset( $ai_response['metadata'] ) ? $ai_response['metadata'] : array();
    
    if ( empty( $ai_products ) ) {
        return; // No AI results either, show native "no results"
    }
    
    // Extract product IDs and metadata
    $product_ids = array();
    $highlight_map = array();
    $explanation_map = array();
    
    foreach ( $ai_products as $product ) {
        if ( isset( $product['id'] ) ) {
            $pid = intval( $product['id'] );
            if ( $pid > 0 ) {
                $product_ids[] = $pid;
                
                if ( ! empty( $product['highlight'] ) ) {
                    $highlight_map[ $pid ] = true;
                }
                
                if ( ! empty( $product['explanation'] ) ) {
                    $explanation_map[ $pid ] = sanitize_text_field( $product['explanation'] );
                }
            }
        }
    }
    
    if ( empty( $product_ids ) ) {
        return;
    }
    
    // 🎯 PAGINATION LOGIC
    $per_page = 12; // Show 12 products initially
    $paged = max( 1, $query->get( 'paged', 1 ) );
    
    // Calculate which products to show on this page
    $offset = ( $paged - 1 ) * $per_page;
    $current_page_ids = array_slice( $product_ids, $offset, $per_page );
    
    if ( empty( $current_page_ids ) ) {
        return; // No products for this page
    }
    
    // 🎯 HIJACK THE QUERY with current page products
    $query->set( 'post_type', 'product' );
    $query->set( 'post_status', 'publish' );
    $query->set( 'post__in', $current_page_ids );
    $query->set( 'orderby', 'post__in' );
    $query->set( 'posts_per_page', $per_page );
    $query->set( 'paged', $paged );
    $query->set( 'ignore_sticky_posts', 1 );
    $query->set( 's', '' ); // Clear search string
    
    // Store ALL data including modern API response in global
    global $semantix_ai_metadata;
    $semantix_ai_metadata = array(
        'highlight_map' => $highlight_map,
        'explanation_map' => $explanation_map,
        'search_term' => $search_query,
        'all_product_ids' => $product_ids,
        'total_products' => count( $product_ids ),
        'current_page' => $paged,
        'per_page' => $per_page,
        'total_pages' => ceil( count( $product_ids ) / $per_page ),
        
        // 🎯 Modern API data
        'pagination' => $pagination,
        'metadata' => $metadata,
        'total_available' => isset( $pagination['totalAvailable'] ) ? $pagination['totalAvailable'] : count( $product_ids ),
        'has_more_on_server' => isset( $pagination['hasMore'] ) ? $pagination['hasMore'] : false,
        'next_token' => isset( $pagination['nextToken'] ) ? $pagination['nextToken'] : null,
        'execution_time' => isset( $metadata['executionTime'] ) ? $metadata['executionTime'] : null,
        'tier_info' => isset( $metadata['tiers'] ) ? $metadata['tiers'] : null,
    );
    
    // Hook to inject AI features
    add_action( 'woocommerce_before_shop_loop', 'semantix_inject_ai_styles', 5 );
    add_action( 'woocommerce_before_shop_loop', 'semantix_inject_container_wrapper_start', 1 );
    add_action( 'woocommerce_before_shop_loop', 'semantix_inject_search_info', 3 );
    add_action( 'woocommerce_after_shop_loop', 'semantix_inject_container_wrapper_end', 999 );
    add_action( 'woocommerce_after_shop_loop_item_title', 'semantix_inject_ai_explanation', 999 );
    add_action( 'woocommerce_after_shop_loop', 'semantix_inject_load_more_button', 997 );
    add_action( 'woocommerce_after_shop_loop', 'semantix_inject_ai_credit', 998 );
    
    // 🎯 FALLBACK: Also try other WooCommerce hooks in case after_shop_loop doesn't fire
    add_action( 'woocommerce_after_main_content', 'semantix_inject_load_more_button_fallback', 10 );
    
    // 🎯 ULTIMATE FALLBACK: wp_footer for search pages
    add_action( 'wp_footer', 'semantix_inject_load_more_button_ultimate_fallback', 999 );
    
    // Hide "no results" messages
    add_filter( 'woocommerce_no_products_found', '__return_false' );
    add_action( 'wp_head', 'semantix_hide_no_results_css', 999 );
}
}


/**
 * Hide any "no results" messages via CSS
 */
if (!function_exists('semantix_hide_no_results_css')) {
function semantix_hide_no_results_css() {
    ?>
    <style>
        /* Hide theme's "no results" messages when AI products are showing */
        .woocommerce-no-products-found,
        .no-results,
        .search-no-results,
        .class-no-found-main,
        .woocommerce-info {
            display: none !important;
        }
    </style>
    <?php
}
}

/**
 * Inject search info with tier breakdown (if available)
 */
if (!function_exists('semantix_inject_search_info')) {
function semantix_inject_search_info() {
    global $semantix_ai_metadata;
    
    if ( empty( $semantix_ai_metadata ) ) {
        return;
    }
    
    $tier_info = isset( $semantix_ai_metadata['tier_info'] ) ? $semantix_ai_metadata['tier_info'] : null;
    $total_available = isset( $semantix_ai_metadata['total_available'] ) ? $semantix_ai_metadata['total_available'] : 0;
    $execution_time = isset( $semantix_ai_metadata['execution_time'] ) ? $semantix_ai_metadata['execution_time'] : null;
    
    // Only show if we have tier info
    if ( ! $tier_info || empty( $tier_info['description'] ) ) {
        return;
    }
    ?>
    <div style="direction: rtl; margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; border-right: 3px solid #667eea;">
        <p style="margin: 0; color: #4b5563; font-size: 14px;">
            ✨ <strong>חיפוש חכם:</strong> <?php echo esc_html( $tier_info['description'] ); ?>
            <?php if ( $execution_time ) : ?>
                <span style="color: #9ca3af; font-size: 12px;">(<?php echo esc_html( $execution_time ); ?>ms)</span>
            <?php endif; ?>
        </p>
    </div>
    <?php
}
}

/**
 * Inject opening wrapper with theme's container class
 */
if (!function_exists('semantix_inject_container_wrapper_start')) {
function semantix_inject_container_wrapper_start() {
    echo '<div class="category-products-section-margin">';
}
}

/**
 * Inject closing wrapper
 */
if (!function_exists('semantix_inject_container_wrapper_end')) {
function semantix_inject_container_wrapper_end() {
    echo '</div><!-- .category-products-section-margin -->';
}
}

/**
 * Inject AI styles (only for explanations, no badges)
 */
if (!function_exists('semantix_inject_ai_styles')) {
function semantix_inject_ai_styles() {
    ?>
    <style>
        /* AI Explanation styling */
        .semantix-product-explanation {
            direction: rtl;
            text-align: right;
            font-size: .9rem;
            line-height: 1.5;
            color: #4b5563;
            background: #f9fafb;
            border-radius: 8px;
            margin: .5rem 0;
            padding: .5rem .75rem;
            position: relative;
        }
        
        .semantix-product-explanation .semantix-ai-icon {
            position: absolute;
            right: .5rem;
            top: .5rem;
        }
        
        .semantix-product-explanation .semantix-explanation-text {
            display: block;
            padding-right: 1.25rem;
        }
    </style>
    <?php
}
}

/**
 * Inject AI explanation for each product
 */
if (!function_exists('semantix_inject_ai_explanation')) {
function semantix_inject_ai_explanation() {
    global $semantix_ai_metadata;
    static $already_rendered = array();
    
    if ( empty( $semantix_ai_metadata['explanation_map'] ) ) {
        return;
    }
    
    $explanation_map = $semantix_ai_metadata['explanation_map'];
    $pid = get_the_ID();
    
    // Prevent duplicates
    if ( isset( $already_rendered[ $pid ] ) ) {
        return;
    }
    
    if ( $pid && isset( $explanation_map[ $pid ] ) && $explanation_map[ $pid ] !== '' ) {
        $allowed = array(
            'br'     => array(),
            'em'     => array(),
            'strong' => array(),
            'span'   => array( 'class' => array() ),
        );
        $text = wp_kses( $explanation_map[ $pid ], $allowed );
        
        // Mark as rendered
        $already_rendered[ $pid ] = true;
        ?>
        <div class="semantix-product-explanation">
            <span class="semantix-ai-icon">✨</span>
            <span class="semantix-explanation-text"><?php echo $text; ?></span>
        </div>
        <?php
    }
}
}

/**
 * Inject "Load More" button with AJAX functionality
 */

/**
 * Inject "Load More" button - using data already in memory
 */
if (!function_exists('semantix_inject_load_more_button')) {
    function semantix_inject_load_more_button() {
        global $semantix_ai_metadata;
        
        // Only show if we have AI metadata
        if ( empty( $semantix_ai_metadata ) ) {
            echo '<!-- Semantix: No AI metadata -->';
            return;
        }
        
        $current_page = isset( $semantix_ai_metadata['current_page'] ) ? $semantix_ai_metadata['current_page'] : 1;
        $total_pages = isset( $semantix_ai_metadata['total_pages'] ) ? $semantix_ai_metadata['total_pages'] : 1;
        $per_page = isset( $semantix_ai_metadata['per_page'] ) ? $semantix_ai_metadata['per_page'] : 12;
        $total_products = isset( $semantix_ai_metadata['total_products'] ) ? $semantix_ai_metadata['total_products'] : 0;
        $all_ids = isset( $semantix_ai_metadata['all_product_ids'] ) ? $semantix_ai_metadata['all_product_ids'] : array();
        
        $shown_so_far = $current_page * $per_page;
        
        // 🎯 Check modern API pagination data
        $total_available = isset( $semantix_ai_metadata['total_available'] ) ? $semantix_ai_metadata['total_available'] : $total_products;
        $has_more_on_server = isset( $semantix_ai_metadata['has_more_on_server'] ) ? $semantix_ai_metadata['has_more_on_server'] : false;
        
        // Calculate if we have more products
        $has_more_in_memory = $total_products > $shown_so_far;
        $remaining = max( 0, $total_products - $shown_so_far );
        
        // Debug output (DETAILED)
        echo sprintf(
            '<!-- Semantix Load More Debug: 
            current_page=%d, total_pages=%d, per_page=%d, 
            total_products=%d, shown_so_far=%d, remaining=%d,
            has_more_in_memory=%s, has_more_on_server=%s, total_available=%d,
            all_ids_count=%d
            -->',
            $current_page, $total_pages, $per_page, 
            $total_products, $shown_so_far, $remaining,
            $has_more_in_memory ? 'YES' : 'NO',
            $has_more_on_server ? 'YES' : 'NO',
            $total_available,
            count($all_ids)
        );
        
        // 🎯 SIMPLIFIED CHECK - Show button if there are more products
        if ( $remaining <= 0 && ! $has_more_on_server ) {
            echo '<!-- Semantix: No more products available (remaining=' . $remaining . ', server=' . ($has_more_on_server ? 'yes' : 'no') . ') -->';
            return;
        }
        
        // If we got here, we have products to show!
        
        $search_term = $semantix_ai_metadata['search_term'];
        $next_page = $current_page + 1;
        
        // Get next batch of product IDs
        $next_offset = $shown_so_far;
        $next_batch_ids = array_slice( $all_ids, $next_offset, $per_page );
        
        if ( empty( $next_batch_ids ) ) {
            echo '<!-- Semantix: Next batch is empty (offset=' . $next_offset . ', per_page=' . $per_page . ') -->';
            return;
        }
        
        echo '<!-- Semantix: Showing Load More button (next_batch_count=' . count($next_batch_ids) . ') -->';
        
        // Also get their metadata
        $highlight_map = isset( $semantix_ai_metadata['highlight_map'] ) ? $semantix_ai_metadata['highlight_map'] : array();
        $explanation_map = isset( $semantix_ai_metadata['explanation_map'] ) ? $semantix_ai_metadata['explanation_map'] : array();
        
        $next_highlights = array();
        $next_explanations = array();
        
        foreach ( $next_batch_ids as $pid ) {
            if ( isset( $highlight_map[ $pid ] ) ) {
                $next_highlights[ $pid ] = true;
            }
            if ( isset( $explanation_map[ $pid ] ) ) {
                $next_explanations[ $pid ] = $explanation_map[ $pid ];
            }
        }
        
        $ajax_url = admin_url('admin-ajax.php');
        $ajax_nonce = wp_create_nonce('semantix_load_more');
        ?>
        <div id="semantix-load-more-section" style="text-align: center; margin: 30px 0; padding: 20px;">
            <button 
                id="semantix-load-more-btn" 
                class="button" 
                style="padding: 12px 30px; font-size: 16px; cursor: pointer; background: #667eea; color: white; border: none; border-radius: 8px; transition: all 0.3s;"
                data-page="<?php echo esc_attr( $next_page ); ?>"
                data-search="<?php echo esc_attr( $search_term ); ?>"
            >
                <?php 
                if ( $has_more_on_server && $total_available > $shown_so_far ) {
                    // Show server total if available
                    $server_remaining = $total_available - $shown_so_far;
                    echo sprintf( 'טען עוד מוצרים (%d+ נוספים)', min( $per_page, $server_remaining ) );
                } elseif ( $remaining > 0 ) {
                    // Show memory remaining
                    echo sprintf( 'טען עוד מוצרים (%d נוספים)', min( $per_page, $remaining ) );
                } else {
                    echo 'טען עוד מוצרים';
                }
                ?>
            </button>
            <div id="semantix-load-more-spinner" style="display: none; margin-top: 15px;">
                <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: semantix-spin 1s linear infinite;"></div>
            </div>
        </div>
        
        <style>
            @keyframes semantix-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        
        <script>
        (function() {
            const btn = document.getElementById('semantix-load-more-btn');
            const spinner = document.getElementById('semantix-load-more-spinner');
            const section = document.getElementById('semantix-load-more-section');
            
            if (!btn) {
                console.error('Semantix: Load More button not found');
                return;
            }
            
            console.log('Semantix: Load More button initialized');
            
            // ALL product data from server
            const allProductIds = <?php echo wp_json_encode( $semantix_ai_metadata['all_product_ids'] ); ?>;
            const allHighlightMap = <?php echo wp_json_encode( $semantix_ai_metadata['highlight_map'] ); ?>;
            const allExplanationMap = <?php echo wp_json_encode( $semantix_ai_metadata['explanation_map'] ); ?>;
            const ajaxUrl = <?php echo wp_json_encode( $ajax_url ); ?>;
            const nonce = <?php echo wp_json_encode( $ajax_nonce ); ?>;
            const perPage = <?php echo intval( $per_page ); ?>;
            
            // Track how many products we've shown
            let currentOffset = <?php echo intval( $shown_so_far ); ?>;
            
            console.log('Semantix: Total products available: ' + allProductIds.length);
            console.log('Semantix: Already shown: ' + currentOffset);
            console.log('Semantix: Remaining: ' + (allProductIds.length - currentOffset));
            
            async function loadMoreProducts() {
                console.log('Semantix: Load More clicked (offset=' + currentOffset + ')');
                btn.disabled = true;
                btn.style.opacity = '0.5';
                spinner.style.display = 'block';
                
                try {
                    // Get next batch of product IDs
                    const nextBatch = allProductIds.slice(currentOffset, currentOffset + perPage);
                    
                    if (nextBatch.length === 0) {
                        section.innerHTML = '<p style="color: #666; font-size: 14px;">✨ כל המוצרים הוצגו</p>';
                        return;
                    }
                    
                    // Get metadata for this batch
                    const batchHighlights = {};
                    const batchExplanations = {};
                    
                    nextBatch.forEach(id => {
                        if (allHighlightMap[id]) {
                            batchHighlights[id] = true;
                        }
                        if (allExplanationMap[id]) {
                            batchExplanations[id] = allExplanationMap[id];
                        }
                    });
                    
                    console.log('Semantix: Loading batch of ' + nextBatch.length + ' products');
                    
                    // Call WordPress AJAX to render these products
                    const formData = new URLSearchParams();
                    formData.append('action', 'semantix_load_more_products');
                    formData.append('product_ids', JSON.stringify(nextBatch));
                    formData.append('highlight_map', JSON.stringify(batchHighlights));
                    formData.append('explanation_map', JSON.stringify(batchExplanations));
                    formData.append('nonce', nonce);
                    
                    const response = await fetch(ajaxUrl, {
                        method: 'POST',
                        body: formData,
                        credentials: 'same-origin'
                    });
                    
                    const data = await response.json();
                    
                    console.log('Semantix: Load More response:', data);
                    
                    if (data.success && data.data.html) {
                        // Append new products
                        const productsContainer = document.querySelector('ul.products');
                        if (productsContainer) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = data.data.html;
                            
                            const newProductElements = tempDiv.querySelectorAll('li.product');
                            console.log('Semantix: Appending ' + newProductElements.length + ' products');
                            
                            newProductElements.forEach(product => {
                                productsContainer.appendChild(product);
                            });
                            
                            // Update offset
                            currentOffset += nextBatch.length;
                            const remaining = allProductIds.length - currentOffset;
                            
                            console.log('Semantix: New offset: ' + currentOffset + ', remaining: ' + remaining);
                            
                            // Check if there are more products
                            if (remaining > 0) {
                                // Update button text
                                const nextCount = Math.min(perPage, remaining);
                                btn.innerHTML = 'טען עוד מוצרים (' + nextCount + ' נוספים)';
                                btn.disabled = false;
                                btn.style.opacity = '1';
                            } else {
                                // No more products
                                section.innerHTML = '<p style="color: #666; font-size: 14px;">✨ כל המוצרים הוצגו</p>';
                            }
                            
                            // Re-initialize WooCommerce scripts
                            if (typeof jQuery !== 'undefined') {
                                jQuery(document.body).trigger('wc_fragment_refresh');
                            }
                        } else {
                            console.error('Semantix: Products container not found');
                            throw new Error('Products container not found');
                        }
                    } else {
                        throw new Error(data.data?.message || 'Failed to load products');
                    }
                } catch (error) {
                    console.error('Semantix: Load more error:', error);
                    alert('שגיאה בטעינת מוצרים נוספים');
                    btn.disabled = false;
                    btn.style.opacity = '1';
                } finally {
                    spinner.style.display = 'none';
                }
            }
            
            btn.addEventListener('click', loadMoreProducts);
        })();
        </script>
        <?php
    }
    }
/**
 * Fallback: Inject Load More button via woocommerce_after_main_content
 */
if (!function_exists('semantix_inject_load_more_button_fallback')) {
function semantix_inject_load_more_button_fallback() {
    global $semantix_ai_metadata;
    
    // Only inject if we have AI metadata and button wasn't already rendered
    static $button_rendered = false;
    
    if ( $button_rendered || empty( $semantix_ai_metadata ) ) {
        return;
    }
    
    echo '<!-- Semantix: Load More injected via woocommerce_after_main_content fallback -->';
    semantix_inject_load_more_button();
    $button_rendered = true;
}
}

/**
 * Ultimate Fallback: Inject Load More button via wp_footer
 */
if (!function_exists('semantix_inject_load_more_button_ultimate_fallback')) {
function semantix_inject_load_more_button_ultimate_fallback() {
    if ( ! is_search() ) {
        return;
    }
    
    global $semantix_ai_metadata;
    
    // Only inject if we have AI metadata and button wasn't already rendered
    static $button_rendered = false;
    
    if ( $button_rendered || empty( $semantix_ai_metadata ) ) {
        return;
    }
    
    echo '<!-- Semantix: Load More injected via wp_footer ultimate fallback -->';
    
    // Try to inject inside the products container if it exists
    ?>
    <script>
    (function() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectLoadMoreButton);
        } else {
            injectLoadMoreButton();
        }
        
        function injectLoadMoreButton() {
            // Look for the products container
            const productsContainer = document.querySelector('ul.products');
            const mainContent = document.querySelector('.woocommerce');
            const categorySection = document.querySelector('.category-products-section-margin');
            
            const targetContainer = categorySection || mainContent || document.querySelector('main');
            
            if (targetContainer && !document.getElementById('semantix-load-more-section')) {
                console.log('Semantix: Injecting Load More button via JavaScript fallback');
                const buttonHtml = <?php 
                    ob_start();
                    semantix_inject_load_more_button();
                    echo wp_json_encode( ob_get_clean() );
                ?>;
                
                if (buttonHtml) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = buttonHtml;
                    targetContainer.appendChild(tempDiv.firstElementChild);
                }
            }
        }
    })();
    </script>
    <?php
    
    $button_rendered = true;
}
}

/**
 * Inject subtle AI credit after product loop
 */
if (!function_exists('semantix_inject_ai_credit')) {
function semantix_inject_ai_credit() {
    global $wp_query;
    ?>
    <div style="text-align: center; margin: 40px 0 20px 0; padding: 20px; border-top: 1px solid #eee;">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            מוצגים <?php echo $wp_query->found_posts; ?> תוצאות מותאמות עבורך
        </p>
        <a href="https://semantix.co.il" target="_blank" rel="noopener" style="display: inline-block; opacity: 0.6; transition: opacity 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
            <img src="https://semantix-ai.com/powered.png" alt="Powered by Semantix" width="100" style="vertical-align: middle;">
        </a>
    </div>
    <?php
}
}

/**
 * Inject AI Search Trigger Widget on search pages with results
 */
if (!function_exists('semantix_inject_ai_search_trigger')) {
function semantix_inject_ai_search_trigger() {
    // Get API settings
    $semantix_search_host = rtrim( get_option( 'semantix_search_api_endpoint', 'https://dashboard-server-ae00.onrender.com/search' ), '/' );
    $semantix_api_key     = get_option( 'semantix_api_key', '' );
    $dbname               = get_option( 'semantix_dbname', 'alcohome' );
    $c1                   = get_option( 'semantix_collection1', 'products' );
    $c2                   = get_option( 'semantix_collection2', 'queries' );
    $ajax_url             = admin_url('admin-ajax.php');
    $ajax_nonce           = wp_create_nonce('semantix_nonce');
    $search_term          = get_search_query();
    ?>
    <style id="semantix-ai-trigger-styles">
        #semantix-ai-trigger-widget {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px 32px;
            border-radius: 50px;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            font-weight: 600;
            direction: rtl;
            text-align: center;
            transition: all 0.3s ease;
            opacity: 0;
            animation: semantix-slide-up 0.5s ease forwards 1s;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        #semantix-ai-trigger-widget:hover {
            transform: translateX(-50%) translateY(-3px);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }
        
        #semantix-ai-trigger-widget .semantix-ai-icon {
            display: inline-block;
            margin-left: 8px;
            font-size: 20px;
            animation: semantix-pulse 2s ease-in-out infinite;
        }
        
        /* Modal Overlay */
        #semantix-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            z-index: 9999998;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        #semantix-modal-overlay.semantix-visible {
            display: flex;
            opacity: 1;
            align-items: center;
            justify-content: center;
        }
        
        /* Modal Window */
        #semantix-modal-window {
            background: white;
            border-radius: 24px;
            width: 95%;
            max-width: 1400px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: scale(0.9) translateY(20px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            flex-direction: column;
        }
        
        #semantix-modal-overlay.semantix-visible #semantix-modal-window {
            transform: scale(1) translateY(0);
            opacity: 1;
        }
        
        /* Modal Header */
        #semantix-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 24px 24px 0 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        #semantix-modal-title {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            direction: rtl;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        #semantix-modal-title .semantix-ai-icon {
            font-size: 28px;
            animation: semantix-pulse 2s ease-in-out infinite;
        }
        
        #semantix-modal-close {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
        }
        
        #semantix-modal-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
        
        /* Modal Content */
        #semantix-modal-content {
            overflow-y: auto;
            padding: 32px;
            flex: 1;
            background: #fafbfc;
        }
        
        #semantix-modal-content::-webkit-scrollbar {
            width: 8px;
        }
        
        #semantix-modal-content::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        #semantix-modal-content::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }
        
        #semantix-modal-content::-webkit-scrollbar-thumb:hover {
            background: #764ba2;
        }
        
        @keyframes semantix-slide-up {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        
        @keyframes semantix-pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            #semantix-ai-trigger-widget {
                bottom: 20px;
                padding: 14px 24px;
                font-size: 14px;
                max-width: 90%;
            }
            
            #semantix-modal-window {
                width: 98%;
                max-height: 95vh;
                border-radius: 16px;
            }
            
            #semantix-modal-header {
                padding: 18px 20px;
                border-radius: 16px 16px 0 0;
            }
            
            #semantix-modal-title {
                font-size: 18px;
            }
            
            #semantix-modal-close {
                width: 36px;
                height: 36px;
                font-size: 20px;
            }
            
            #semantix-modal-content {
                padding: 20px 16px;
            }
        }
    </style>
    
    <div id="semantix-ai-trigger-widget">
        <span class="semantix-ai-icon">✨</span>
        לא אהבת את התוצאות? לחץ כאן וAI יעשה את העבודה
    </div>
    
    <!-- Modal Overlay -->
    <div id="semantix-modal-overlay">
        <div id="semantix-modal-window">
            <div id="semantix-modal-header">
                <h2 id="semantix-modal-title">
                    <span class="semantix-ai-icon">✨</span>
                    חיפוש AI חכם
                </h2>
                <button id="semantix-modal-close" aria-label="Close">×</button>
            </div>
            <div id="semantix-modal-content">
                <!-- AI search results will be loaded here -->
            </div>
        </div>
    </div>
    
    <script id="semantix-ai-trigger-script">
    (function() {
        'use strict';
        
        const SEMANTIX_API_SEARCH_ENDPOINT = <?php echo wp_json_encode( $semantix_search_host ); ?>;
        const SEMANTIX_API_KEY = <?php echo wp_json_encode( $semantix_api_key ); ?>;
        const SEMANTIX_DBNAME = <?php echo wp_json_encode( $dbname ); ?>;
        const SEMANTIX_COLLECTION1 = <?php echo wp_json_encode( $c1 ); ?>;
        const SEMANTIX_COLLECTION2 = <?php echo wp_json_encode( $c2 ); ?>;
        const WP_AJAX_URL = <?php echo wp_json_encode( $ajax_url ); ?>;
        const WP_AJAX_NONCE = <?php echo wp_json_encode( $ajax_nonce ); ?>;
        const SEARCH_TERM = <?php echo wp_json_encode( $search_term ); ?>;
        
        const widget = document.getElementById('semantix-ai-trigger-widget');
        const modalOverlay = document.getElementById('semantix-modal-overlay');
        const modalWindow = document.getElementById('semantix-modal-window');
        const modalContent = document.getElementById('semantix-modal-content');
        const modalClose = document.getElementById('semantix-modal-close');
        
        if (!widget || !modalOverlay) return;
        
        // Open modal on widget click
        widget.addEventListener('click', function() {
            openModal();
        });
        
        // Close modal on close button click
        modalClose.addEventListener('click', function() {
            closeModal();
        });
        
        // Close modal on overlay click (outside the modal window)
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('semantix-visible')) {
                closeModal();
            }
        });
        
        function openModal() {
            modalOverlay.classList.add('semantix-visible');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            loadModalContent();
        }
        
        function closeModal() {
            modalOverlay.classList.remove('semantix-visible');
            document.body.style.overflow = ''; // Restore scrolling
        }
        
        async function loadModalContent() {
            try {
                // Show loading state in modal
                modalContent.innerHTML = `
                    <div style="text-align: center; padding: 80px 20px; direction: rtl;">
                        <div style="display: inline-block; width: 60px; height: 60px; border: 5px solid #f3f3f3; border-top: 5px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <h3 style="margin-top: 30px; font-size: 24px; color: #667eea; font-weight: 700;">✨ AI מעבד את החיפוש שלך</h3>
                        <p style="margin-top: 10px; font-size: 16px; color: #6b7280;">מוצא את המוצרים המתאימים ביותר בשבילך...</p>
                    </div>
                `;
                
                // Add spinner animation
                const spinnerStyle = document.createElement('style');
                spinnerStyle.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(spinnerStyle);
                
                // Fetch the AI search template via AJAX
                const formData = new URLSearchParams();
                formData.append('action', 'semantix_render_custom_template');
                formData.append('search_term', SEARCH_TERM);
                formData.append('nonce', WP_AJAX_NONCE);
                
                const response = await fetch(WP_AJAX_URL, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    throw new Error('Server Error: ' + response.status);
                }
                
                const templateHtml = await response.text();
                
                if (!templateHtml || templateHtml.trim() === '0') {
                    throw new Error('Empty template response');
                }
                
                // Insert template into modal
                modalContent.innerHTML = templateHtml;
                
                // Execute any scripts in the template
                const scripts = modalContent.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.textContent = oldScript.textContent;
                    
                    // Remove old script and append new one to ensure execution
                    oldScript.parentNode.removeChild(oldScript);
                    modalContent.appendChild(newScript);
                });
                
            } catch (error) {
                console.error('Semantix Modal Load Error:', error);
                
                // Show error message in modal
                modalContent.innerHTML = `
                    <div style="text-align: center; padding: 80px 20px; direction: rtl; background: #fef2f2; border-radius: 12px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                        <h3 style="font-size: 24px; color: #dc2626; margin: 0 0 10px 0;">שגיאה בטעינת חיפוש AI</h3>
                        <p style="font-size: 16px; color: #6b7280; margin: 0;">${error.message}</p>
                        <button onclick="document.getElementById('semantix-modal-close').click()" style="
                            margin-top: 30px;
                            padding: 12px 32px;
                            background: #667eea;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                        ">סגור</button>
                    </div>
                `;
            }
        }
        
        // Add keyframes for spinner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
    })();
    </script>
    <?php
    }
}

/**
 * Custom function to display product thumbnails with specific dimensions.
 * This will be hooked into the WooCommerce loop.
 */
/*
if (!function_exists('semantix_custom_product_thumbnail')) {
    function semantix_custom_product_thumbnail() {
    global $product;
    $image_size = array(350, 450); // Set fixed size
    $thumbnail_id = get_post_thumbnail_id();

    if ($thumbnail_id) {
        // Request the specific image size from WordPress
        $image = wp_get_attachment_image_src($thumbnail_id, $image_size);
        if ($image) {
            $image_url = $image[0];
            // Enforce the size and aspect ratio with inline styles
            echo '<img src="' . esc_url($image_url) . '" alt="' . esc_attr($product->get_name()) . '" width="350" height="450" style="width:350px; height:450px; object-fit:cover;" />';
        } else {
            // Fallback to a placeholder if the specific image size can't be generated
            echo wc_placeholder_img($image_size);
        }
    } else {
        // Fallback for products with no image
        echo wc_placeholder_img($image_size);
    }
    }
}
*/

/**
 * Enqueue scripts for search results page (simplified)
 */
if (!function_exists('semantix_enqueue_ajax_script')) {
function semantix_enqueue_ajax_script() {
    if (is_search() && !is_admin()) {
        wp_enqueue_script('jquery'); // Ensure jQuery is loaded
    }
    }
}
add_action('wp_enqueue_scripts', 'semantix_enqueue_ajax_script');


// First, remove the old hook if it exists
remove_action( 'plugins_loaded', 'semantix_create_custom_template' ); // Assuming this was an old name
remove_action( 'after_setup_theme', 'semantix_create_custom_template' );  // Assuming this was an old name
// Remove any specific named function like 'semantix_create_native_template' if that was also used before
remove_action( 'activate_' . plugin_basename( __FILE__ ), 'semantix_create_native_template' );


// Add the new enhanced hook


/**
 * AJAX handler to render WooCommerce products with NATIVE styling
 */
add_action('wp_ajax_semantix_render_products', 'semantix_render_products_ajax');
add_action('wp_ajax_nopriv_semantix_render_products', 'semantix_render_products_ajax');

// Add the native action handler (same as the regular one)
add_action('wp_ajax_semantix_render_products_native', 'semantix_render_products_ajax');
add_action('wp_ajax_nopriv_semantix_render_products_native', 'semantix_render_products_ajax');

/**
 * AJAX handler to render the full custom template
 */
add_action('wp_ajax_semantix_render_custom_template', 'semantix_render_custom_template_ajax');
add_action('wp_ajax_nopriv_semantix_render_custom_template', 'semantix_render_custom_template_ajax');

if (!function_exists('semantix_render_custom_template_ajax')) {
function semantix_render_custom_template_ajax() {
    // Verify nonce
    if ( ! isset($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'semantix_nonce' ) ) {
        wp_send_json_error( ['message' => 'Invalid nonce'] );
        wp_die();
    }
    
    // Get search term
    $search_term = isset($_POST['search_term']) ? sanitize_text_field( wp_unslash( $_POST['search_term'] ) ) : '';
    
    if (empty($search_term)) {
        wp_send_json_error( ['message' => 'Missing search term'] );
        wp_die();
    }
    
    // Get template settings
    $show_header_title = get_option('semantix_show_header_title', 1);
    $title_font_family = get_option( 'semantix_title_font_family', "'Inter', sans-serif" );
    $title_font_weight = get_option( 'semantix_title_font_weight', '600' );
    $price_font_family = get_option( 'semantix_price_font_family', "'Inter', sans-serif" );
    $price_font_weight = get_option( 'semantix_price_font_weight', '700' );
    $card_width     = get_option( 'semantix_card_width', '320' );
    $card_height    = get_option( 'semantix_card_height', '420' );
    $image_height   = get_option( 'semantix_image_height', '240' );
    $card_bg        = get_option( 'semantix_card_bg_color', '#ffffff' );
    $title_color    = get_option( 'semantix_title_color', '#1a1a1a' );
    $price_color    = get_option( 'semantix_price_color', '#2563eb' );
    $grid_gap       = get_option( 'semantix_grid_gap', '2' );
    $card_border_radius = get_option( 'semantix_card_border_radius', '16' );
    $image_fit      = get_option( 'semantix_image_fit', 'contain' );
    $api_endpoint   = get_option( 'semantix_search_api_endpoint', 'https://dashboard-server-ae00.onrender.com/search' );
    $api_key        = get_option( 'semantix_api_key', '' );
    $dbname         = get_option( 'semantix_dbname', 'alcohome' );
    $c1             = get_option( 'semantix_collection1', 'products' );
    $c2             = get_option( 'semantix_collection2', 'queries' );
    
    $js_data = [
        'apiEndpoint'  => $api_endpoint,
        'apiKey'       => $api_key,
        'dbName'       => $dbname,
        'collection1'  => $c1,
        'collection2'  => $c2,
        'searchQuery'  => $search_term
    ];
    
    // Render the template inline (without get_header/get_footer)
    ob_start();
    ?>
    <style id="semantix-custom-styles">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .semantix-results-page-wrapper {
            width: 100%;
            margin: 0 auto;
            padding: 0;
            font-family: <?php echo esc_attr( $title_font_family ); ?>;
        }

        #semantix-custom-results-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }

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

        #semantix-custom-results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(<?php echo esc_attr( max(280, $card_width) ); ?>px, 1fr));
            gap: <?php echo esc_attr( $grid_gap ); ?>rem;
            justify-items: center;
            margin-top: 2rem;
        }

        .semantix-product-card {
            width: 100%;
            max-width: <?php echo esc_attr( $card_width ); ?>px;
            min-height: <?php echo esc_attr( $card_height ); ?>px;
            background: <?php echo esc_attr( $card_bg ); ?>;
            border-radius: <?php echo esc_attr( $card_border_radius ); ?>px;
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

        .semantix-product-image-container {
            position: relative;
            width: 100%;
            height: <?php echo esc_attr( $image_height ); ?>px !important;
            overflow: hidden;
            background: #fdfdfd;
        }

        .semantix-product-image {
            width: 100%; height: 100% !important; object-fit: <?php echo esc_attr( $image_fit ); ?>; transition: transform 0.3s ease;
        }
        .semantix-product-card:hover .semantix-product-image { transform: scale(1.05); }
        
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
            margin: 0.5rem 0 1rem;
        }
        
        .semantix-product-explanation {
            font-size: 0.875rem;
            color: #4b5563;
            line-height: 1.5;
            margin: 1rem 0;
            padding: 0.75rem 2.5rem 0.75rem 1rem;
            background: #f9fafb;
            border-radius: 8px;
            text-align: right;
            direction: rtl;
            position: relative;
        }

        .semantix-product-explanation::before {
            content: '✨';
            position: absolute;
            top: 0.75rem;
            right: 1rem;
            font-size: 1rem;
            color: #60a5fa;
        }

        .semantix-perfect-match-badge {
            position: absolute; 
            top: 12px; 
            left: 12px; 
            background: #1a1a1a; 
            color: white;
            padding: 6px 12px; 
            border-radius: 12px; 
            font-size: 0.75rem; 
            font-weight: 700;
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            z-index: 2;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .semantix-perfect-match-badge::before {
            content: '✨';
            font-size: 0.9rem;
        }
        
        .semantix-loader, .semantix-empty-state, .semantix-error-state {
            grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: #6b7280;
        }
        .semantix-loader::before {
            content: ''; display: inline-block; width: 2rem; height: 2rem; border: 3px solid #e5e7eb;
            border-top: 3px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 1rem; vertical-align: middle;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

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

    <div class="semantix-results-page-wrapper">
        <div id="semantix-custom-results-container">
            <?php if ($show_header_title) : ?>
            <div class="semantix-header">
                <h1 class="semantix-search-title" id="semantix-search-title">
                    תוצאות חיפוש AI עבור "<?php echo esc_html($search_term); ?>"
                </h1>
                <a href="https://semantix.co.il" target="_blank" class="semantix-powered-logo">
                    <img src="https://semantix-ai.com/powered.png" alt="Semantix logo" width="120">
                </a>
            </div>
            <?php endif; ?>

            <div id="semantix-custom-results-grid">
                <div class="semantix-loader">טוען תוצאות...</div>
            </div>
        </div>
    </div>

    <script>
    (function() {
        'use strict';
        
        const SEMANTIX_DATA = <?php echo wp_json_encode( $js_data ); ?>;
        const resultsGrid = document.getElementById('semantix-custom-results-grid');
        
        const C = {
            cacheKey: 'semantix_search_cache',
            maxItems: 50,
            expiryHours: 24
        };

        const query = SEMANTIX_DATA.searchQuery;

        function loadCache() {
            try { 
                const cached = JSON.parse(sessionStorage.getItem(C.cacheKey));
                if (cached && cached.query === query && cached.ts) {
                    const now = Date.now();
                    const expiryTime = cached.ts + (C.expiryHours * 60 * 60 * 1000);
                    if (now < expiryTime) {
                        console.log('Semantix: Loaded ' + cached.results.length + ' cached results for "' + query + '"');
                        return cached.results;
                    }
                }
                return null;
            }
            catch { return null; }
        }

        function saveCache(items) {
            try {
                sessionStorage.setItem(C.cacheKey, JSON.stringify({ 
                    query: query, 
                    results: items.slice(0, C.maxItems), 
                    ts: Date.now() 
                }));
                console.log('Semantix: Cached ' + items.length + ' results for "' + query + '"');
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

    const cachedResults = loadCache();
    if (cachedResults) {
        renderProducts(cachedResults);
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
                query: query,
                dbName: SEMANTIX_DATA.dbName,
                collectionName1: SEMANTIX_DATA.collection1,
                collectionName2: SEMANTIX_DATA.collection2,
                modern: true  // ✅ Enable modern mode
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('API Error: ' + response.status + ' - ' + errorText);
        }

        const data = await response.json();
        
        // 🎯 Handle modern response structure
        let products = [];
        let pagination = null;
        let metadata = null;
        
        if (data.products && Array.isArray(data.products)) {
            // Modern mode response
            products = data.products;
            pagination = data.pagination || null;
            metadata = data.metadata || null;
            
            // Log useful info
            if (metadata && metadata.executionTime) {
                console.log(`Semantix: Search completed in ${metadata.executionTime}ms`);
            }
            if (pagination && pagination.totalAvailable) {
                console.log(`Semantix: Found ${pagination.totalAvailable} total results, showing ${pagination.returned}`);
            }
            if (metadata && metadata.tiers && metadata.tiers.description) {
                console.log(`Semantix: ${metadata.tiers.description}`);
            }
        } else if (Array.isArray(data)) {
            // Legacy response (fallback)
            products = data;
        }
        
        saveCache(products);
        renderProducts(products);
        
        // Show tier info if available
        if (metadata && metadata.tiers && metadata.tiers.description) {
            showTierInfo(metadata.tiers.description);
        }

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

            products.forEach(function(product) {
                const card = document.createElement('div');
                card.className = 'semantix-product-card';

                const productLink = product.url || '/?p=' + product.id;
                const productImage = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                const productPrice = product.price ? product.price + ' ₪' : '';
                const perfectMatchBadge = product.highlight ? '<div class="semantix-perfect-match-badge">PERFECT MATCH</div>' : '';
                const productExplanation = product.explanation ? '<div class="semantix-product-explanation">' + product.explanation + '</div>' : '';

                card.innerHTML = 
                    '<a href="' + productLink + '" class="semantix-product-link" aria-label="View ' + (product.name || 'product') + '">' +
                        '<div class="semantix-product-image-container">' +
                            perfectMatchBadge +
                            '<img src="' + productImage + '" alt="' + (product.name || 'Product Image') + '" class="semantix-product-image" loading="lazy">' +
                        '</div>' +
                    '</a>' +
                    '<div class="semantix-product-content">' +
                        '<h2 class="semantix-product-title">' +
                            '<a href="' + productLink + '">' + (product.name || 'Untitled Product') + '</a>' +
                        '</h2>' +
                        productExplanation +
                        (productPrice ? '<div class="semantix-product-price">' + productPrice + '</div>' : '') +
                    '</div>';
                
                resultsGrid.appendChild(card);
            });
        }

        function showEmptyState() {
            resultsGrid.innerHTML = '<div class="semantix-empty-state"><h3>לא נמצאו מוצרים</h3><p>לא הצלחנו למצוא מוצרים התואמים לחיפוש שלך. נסה מילות חיפוש שונות.</p></div>';
        }

        function showErrorState(message) {
            resultsGrid.innerHTML = '<div class="semantix-error-state"><h3>משהו השתבש</h3><p>' + message + '</p></div>';
        }

        window.semantixClearSearchCache = function() {
            try {
                sessionStorage.removeItem(C.cacheKey);
                console.log('Semantix: Search cache cleared');
            } catch (error) {
                console.warn('Semantix: Failed to clear search cache:', error);
            }
        };

        // Execute search immediately
        fetchResults();
    })();
    </script>
    <?php
    
    $template_html = ob_get_clean();
    echo $template_html;
    wp_die();
}
}

if (!function_exists('semantix_render_products_ajax')) {
function semantix_render_products_ajax() {
    // Verify nonce
    if ( ! isset($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'semantix_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Security check failed' ), 403 );
        wp_die();
    }

    $product_ids_json    = isset($_POST['product_ids'])    ? stripslashes( $_POST['product_ids'] )    : '[]';
    $highlight_map_json  = isset($_POST['highlight_map'])  ? stripslashes( $_POST['highlight_map'] )  : '{}';
    $explanation_map_json= isset($_POST['explanation_map'])? stripslashes( $_POST['explanation_map'] ): '{}';

    $product_ids_arr     = json_decode( $product_ids_json, true );
    $highlight_map_arr   = json_decode( $highlight_map_json, true );
    $explanation_map_arr = json_decode( $explanation_map_json, true );

    if ( json_last_error() !== JSON_ERROR_NONE || ! is_array( $product_ids_arr ) ) {
        wp_send_json_error( array( 'message' => 'Invalid product data format.' ), 400 );
        wp_die();
    }

    if ( empty( $product_ids_arr ) ) {
        ob_start();
        wc_get_template( 'loop/no-products-found.php' );
        echo ob_get_clean();
        wp_die();
    }

    // No filtering - show all products returned by API
    $final_product_ids        = array();
    $highlighted_products_api = array();

    foreach ( $product_ids_arr as $raw_id ) {
        $pid = intval( $raw_id );
        if ( $pid > 0 ) {
            $final_product_ids[] = $pid;
            if ( ! empty( $highlight_map_arr[ (string) $raw_id ] ) ) {
                $highlighted_products_api[] = $pid;
            }
        }
    }

    if ( empty( $final_product_ids ) ) {
        ob_start();
        wc_get_template( 'loop/no-products-found.php' );
        echo ob_get_clean();
        wp_die();
    }

    // Columns as theme expects
    $columns = (int) wc_get_theme_support( 'product_grid::default_columns' );
    if ( ! $columns ) {
        $columns = (int) wc_get_default_products_per_row();
        if ( ! $columns ) $columns = 4;
    }

    wc_setup_loop( array(
        'name'         => 'semantix_native_search',
        'columns'      => $columns,
        'is_shortcode' => false,
        'is_paginated' => false,
        'total'        => count( $final_product_ids ),
        'per_page'     => count( $final_product_ids ),
        'current_page' => 1,
    ) );

    // Query products (no status filtering - show all)
    $products_query = new WP_Query( array(
        'post_type'           => 'product',
        'post_status'         => array('publish', 'private', 'draft'),
        'post__in'            => $final_product_ids,
        'orderby'             => 'post__in',
        'posts_per_page'      => -1,
        'ignore_sticky_posts' => 1,
    ) );

    // Optional: AI highlight label
    if ( ! empty( $highlighted_products_api ) ) {
        echo '<style>';
        foreach ( $highlighted_products_api as $hid ) {
            echo '.post-' . esc_attr( $hid ) . '{position:relative;margin-bottom:35px;}';
            echo '.post-' . esc_attr( $hid ) . '::before{content:"✨ AI PERFECT MATCH ✨";position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:8px 14px;border-radius:8px;font-size:.75rem;font-weight:600;z-index:15;border:1px solid #333;white-space:nowrap;min-width:160px;text-align:center;}';
        }
        echo '</style>';
    }

    // Inject explanation below title (native-safe)
    // We capture the map in the closure and print only if exists for current product.
    $explanations = is_array( $explanation_map_arr ) ? $explanation_map_arr : array();
    $hook_priority = 999;
    add_action( 'woocommerce_after_shop_loop_item_title', function() use ( $explanations ) {
        $pid = get_the_ID();
        if ( $pid && isset( $explanations[ (string) $pid ] ) && $explanations[ (string) $pid ] !== '' ) {
            // Minimal safe styles; RTL; small; subtle
            $allowed = array(
                'br' => array(),
                'em' => array(),
                'strong' => array(),
                'span' => array( 'class' => array() ),
            );
            $text = wp_kses( $explanations[ (string) $pid ], $allowed );
            echo '<div class="semantix-product-explanation" style="direction:rtl;text-align:right;font-size:.9rem;line-height:1.5;color:#4b5563;background:#f9fafb;border-radius:8px;margin:.5rem 0;padding:.5rem .75rem;position:relative;">';
            echo '<span style="position:absolute;right:.5rem;top:.5rem;">✨</span>';
            echo '<span style="display:block;padding-right:1.25rem;">' . $text . '</span>';
            echo '</div>';
        }
    }, $hook_priority );

    if ( $products_query->have_posts() ) {
        woocommerce_product_loop_start();

        while ( $products_query->have_posts() ) {
            $products_query->the_post();
            wc_get_template_part( 'content', 'product' ); // native theme card
        }

        woocommerce_product_loop_end();
    } else {
        wc_get_template( 'loop/no-products-found.php' );
    }

    // Cleanup
    wp_reset_postdata();
    wc_reset_loop();

    wp_die();
}
}

/**
 * Try to render product using Elementor template
 * Returns rendered content or false if no Elementor template available
 */
if (!function_exists('semantix_render_elementor_product_content')) {
function semantix_render_elementor_product_content( $product_id ) {
    // Check if Elementor is active
    if ( ! class_exists( '\Elementor\Plugin' ) ) {
        return false;
    }

    // Method 1: Check for Elementor Pro WooCommerce templates
    if ( class_exists( '\ElementorPro\Modules\Woocommerce\Module' ) ) {
        $elementor_template_id = semantix_get_elementor_wc_template( 'product-archive' );
        
        if ( $elementor_template_id ) {
            return semantix_render_elementor_template( $elementor_template_id, $product_id );
        }
    }

    // Method 2: Check for custom Elementor product templates
    $custom_template_id = get_post_meta( $product_id, '_elementor_template_id', true );
    if ( $custom_template_id ) {
        return semantix_render_elementor_template( $custom_template_id, $product_id );
    }

    // Method 3: Check for theme's Elementor product template
    $theme_template_id = semantix_get_theme_elementor_product_template();
    if ( $theme_template_id ) {
        return semantix_render_elementor_template( $theme_template_id, $product_id );
    }

    // Method 4: Look for any Elementor template tagged for products
    $template_id = semantix_find_elementor_product_template();
    if ( $template_id ) {
        return semantix_render_elementor_template( $template_id, $product_id );
    }

    return false; // No Elementor template found
    }
}

/**
 * Get Elementor WooCommerce template ID
 */
if (!function_exists('semantix_get_elementor_wc_template')) {
function semantix_get_elementor_wc_template( $template_type ) {
    if ( ! class_exists( '\ElementorPro\Modules\ThemeBuilder\Module' ) ) {
        return false;
    }

    $template_id = \ElementorPro\Modules\ThemeBuilder\Module::instance()
        ->get_conditions_manager()
        ->get_documents_for_location( $template_type );

    return $template_id ? $template_id[0] : false;
    }
}

/**
 * Look for theme's Elementor product template
 */
if (!function_exists('semantix_get_theme_elementor_product_template')) {
function semantix_get_theme_elementor_product_template() {
    // Look for common Elementor template names
    $template_names = [
        'elementor-product-template',
        'product-template-elementor',
        'wc-product-elementor'
    ];

    foreach ( $template_names as $template_name ) {
        $template = get_page_by_path( $template_name, OBJECT, 'elementor_library' );
        if ( $template ) {
            return $template->ID;
        }
    }

    return false;
    }
}

/**
 * Find any Elementor template that might be used for products
 */
if (!function_exists('semantix_find_elementor_product_template')) {
function semantix_find_elementor_product_template() {
    $args = array(
        'post_type' => 'elementor_library',
        'meta_query' => array(
            array(
                'key' => '_elementor_template_type',
                'value' => array( 'loop-item', 'single-product', 'archive-product' ),
                'compare' => 'IN'
            )
        ),
        'posts_per_page' => 1
    );

    $templates = get_posts( $args );
    return $templates ? $templates[0]->ID : false;
    }
}

/**
 * Render Elementor template for specific product
 */
if (!function_exists('semantix_render_elementor_template')) {
function semantix_render_elementor_template( $template_id, $product_id ) {
    if ( ! class_exists( '\Elementor\Plugin' ) ) {
        return false;
    }

    try {
        // Set up global product data
        global $product;
        $product = wc_get_product( $product_id );
        
        if ( ! $product ) {
            return false;
        }

        // Start output buffering
        ob_start();

        // Get Elementor frontend instance
        $elementor = \Elementor\Plugin::$instance->frontend;

        // Render the template
        echo $elementor->get_builder_content_for_display( $template_id );

        // Get the rendered content
        $content = ob_get_clean();

        // Reset global product
        $product = null;

        return $content;

    } catch ( Exception $e ) {
        // Log error and return false
        error_log( 'Semantix Elementor rendering error: ' . $e->getMessage() );
        return false;
    }
    }
}

/**
 * Enhanced version that also tries to detect Elementor styling
 */
if (!function_exists('semantix_get_elementor_product_styles')) {
function semantix_get_elementor_product_styles( $template_id ) {
    if ( ! $template_id || ! class_exists( '\Elementor\Plugin' ) ) {
        return '';
    }

    try {
        // Get Elementor CSS for the template
        $css_file = new \Elementor\Core\Files\CSS\Post( $template_id );
        return $css_file->get_content();
    } catch ( Exception $e ) {
        return '';
    }
    }
}

/**
 * Add custom styles for highlighted products
 */
// remove_action( 'wp_head', 'semantix_add_highlight_styles' ); // Remove old one if it existed

/**
 * Ensure WooCommerce scripts and styles are loaded on search pages
 */
if (!function_exists('semantix_ensure_woocommerce_assets')) {
function semantix_ensure_woocommerce_assets() {
    if ( is_search() && class_exists( 'WooCommerce' ) && !is_admin() ) {
        wp_enqueue_script( 'wc-add-to-cart' );
        wp_enqueue_script( 'woocommerce' );
        if (function_exists('wc_enqueue_js')) { // Newer WC versions
            wc_enqueue_js( "
                // Any specific JS needed for WC compatibility on search results
                jQuery( function( $ ) {
                    // Example: Re-initialize variation forms if loaded via AJAX
                    // $( document.body ).on( 'semantix_results_loaded', function() { // Custom event
                    //     $( '.variations_form' ).each( function() {
                    //         $( this ).wc_variation_form();
                    //     });
                    // });
                });
            " );
        }

        wp_enqueue_style( 'woocommerce-layout' );
        wp_enqueue_style( 'woocommerce-smallscreen' );
        wp_enqueue_style( 'woocommerce-general' );
    }
    }
}
add_action( 'wp_enqueue_scripts', 'semantix_ensure_woocommerce_assets' );

// --- Admin Panel and Other Plugin Functionality ---
// (All your existing admin panel code, widget registration, shortcode attribute filters,
//  tracking functions, etc., should be here, unchanged from your original file)

add_action('admin_menu', 'semantix_add_admin_menu');
add_action('admin_enqueue_scripts', 'semantix_admin_enqueue_scripts',20);
add_action('admin_enqueue_scripts', 'semantix_load_preview_assets');

if (!function_exists('semantix_load_preview_assets')) {
    function semantix_load_preview_assets($hook) {
        // Only load on our plugin's pages where a preview is shown.
        if (strpos($hook, 'semantix-search') === false) {
            return;
        }

        // These hooks add the necessary JS/CSS to the admin page's head and footer
        // to make the search bar preview functional.
        add_action('admin_head', 'semantix_add_global_styles_and_scripts');
        add_action('admin_head', 'semantix_add_admin_settings_js');
        add_action('admin_footer', 'semantix_enhance_search_forms');
    }
}

/**
 * Add menu item
 */
if (!function_exists('semantix_add_admin_menu')) {
function semantix_add_admin_menu() {
    add_menu_page(
        __('Semantix AI Search', 'semantix-ai-search'),
        __('Semantix Search', 'semantix-ai-search'),
        'manage_options',
        'semantix-ai-search',
        'semantix_admin_page',
        'dashicons-search',
        58
    );
    add_submenu_page('semantix-ai-search', __('Dashboard', 'semantix-ai-search'), __('Dashboard', 'semantix-ai-search'), 'manage_options', 'semantix-ai-search', 'semantix_admin_page');
    add_submenu_page('semantix-ai-search', __('Placeholders', 'semantix-ai-search'), __('Placeholders', 'semantix-ai-search'), 'manage_options', 'semantix-search-placeholders', 'semantix_search_placeholders_page');
    add_submenu_page('semantix-ai-search', __('Advanced Settings', 'semantix-ai-search'), __('Advanced Settings', 'semantix-ai-search'), 'manage_options', 'semantix-search-advanced', 'semantix_search_advanced_page');
    }
}

if (!function_exists('semantix_admin_enqueue_scripts')) {
function semantix_admin_enqueue_scripts($hook) {
    if (strpos($hook, 'semantix-') === false) return;
    if ( class_exists( 'WooCommerce' ) ) wp_enqueue_style( 'woocommerce_admin_styles', WC()->plugin_url() . '/assets/css/admin.css', array(), WC_VERSION );
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    wp_enqueue_style('semantix-admin-style', plugin_dir_url( __FILE__ ) . 'assets/css/admin.css', array( 'woocommerce_admin_styles' ), '1.0.0');
    wp_enqueue_script('semantix-admin-script', plugin_dir_url(__FILE__) . 'assets/js/admin.js', array('jquery', 'wp-color-picker'), '1.0.0', true);
    }
}

if (!function_exists('semantix_admin_page')) {
function semantix_admin_page() {
    $total_searches = get_option('semantix_total_searches', 0);
    $popular_searches = get_option('semantix_popular_searches', array());
    ?>
    <div class="wrap woocommerce semantix-admin-wrap">
        <h1><?php echo esc_html__('Semantix AI Search Dashboard', 'semantix-ai-search'); ?></h1>
        <div class="semantix-dashboard-welcome"><div class="semantix-welcome-panel">
            <h2><?php echo esc_html__('Welcome to Semantix AI Search', 'semantix-ai-search'); ?></h2>
            <p class="about-description"><?php echo esc_html__('Enhance your site\'s search experience with AI-powered search that understands what your customers are looking for.', 'semantix-ai-search'); ?></p>
            <div class="semantix-welcome-panel-content">
                <div class="semantix-welcome-panel-column">
                    <h3><?php echo esc_html__('Getting Started', 'semantix-ai-search'); ?></h3>
                    <ul>
                        <li><a href="<?php echo esc_url(admin_url('admin.php?page=semantix-search-placeholders')); ?>"><?php echo esc_html__('Set up dynamic search placeholders', 'semantix-ai-search'); ?></a></li>
                        <li><a href="<?php echo esc_url(admin_url('admin.php?page=semantix-search-advanced')); ?>"><?php echo esc_html__('Configure advanced search settings', 'semantix-ai-search'); ?></a></li>
                    </ul>
                </div>
                <div class="semantix-welcome-panel-column">
                    <h3><?php echo esc_html__('Usage', 'semantix-ai-search'); ?></h3>
                    <ul>
                        <li><?php echo esc_html__('Shortcode: ', 'semantix-ai-search'); ?><code>[semantix_search_bar]</code></li>
                        <li><?php echo esc_html__('Widget: Add the "Semantix AI Search Bar" widget to any widget area', 'semantix-ai-search'); ?></li>
                        <li><?php echo esc_html__('Auto-replace: The plugin automatically replaces standard WordPress and WooCommerce search forms', 'semantix-ai-search'); ?></li>
                    </ul>
                </div>
                <?php if (!empty($total_searches)) : ?>
                <div class="semantix-welcome-panel-column">
                    <h3><?php echo esc_html__('Search Analytics', 'semantix-ai-search'); ?></h3>
                    <p><?php echo esc_html(sprintf(__('Total Searches: %d', 'semantix-ai-search'), $total_searches)); ?></p>
                    <?php if (!empty($popular_searches)) : ?>
                        <h4><?php echo esc_html__('Popular Searches', 'semantix-ai-search'); ?></h4>
                        <ul><?php foreach ($popular_searches as $search => $count) : ?><li><?php echo esc_html($search); ?> (<?php echo esc_html($count); ?>)</li><?php endforeach; ?></ul>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div></div>
        <div class="semantix-admin-boxes">
            <div class="semantix-admin-box">
                <h2><?php echo esc_html__('Live Preview of Enhanced Search', 'semantix-ai-search'); ?></h2>
                <p><?php echo esc_html__('The plugin will automatically enhance your theme\'s native search bar. Visit your site to see it in action. Below is a standard search form which should be enhanced on this page as well.', 'semantix-ai-search'); ?></p>
                <div class="semantix-preview-container"><?php get_search_form(); ?></div>
            </div>
        </div>
    </div>
    <?php
}
}

if (!function_exists('semantix_search_placeholders_page')) {
function semantix_search_placeholders_page() {
    // Check if settings were updated
    if (isset($_GET['settings-updated']) && $_GET['settings-updated'] == 'true') {
        echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Placeholder settings saved successfully!', 'semantix-ai-search') . '</p></div>';
    }
    $placeholders = get_option('semantix_placeholders', 'יין אדום צרפתי, פירותי וקליל, יין לבן מרענן'); 
    $placeholder_speed = get_option('semantix_placeholder_speed', 3000);
    ?>
    <div class="wrap woocommerce semantix-admin-wrap">
        <h1><?php echo esc_html__('Search Placeholders', 'semantix-ai-search'); ?></h1>
        <form method="post" action="options.php" id="semantix-placeholders-form">
            <?php 
            settings_fields('semantix-placeholders-group'); 
            do_settings_sections('semantix-placeholders-group');
            ?>
            <div class="semantix-admin-box">
                <h2><?php echo esc_html__('Dynamic Placeholders', 'semantix-ai-search'); ?></h2>
                <p><?php echo esc_html__('Add search suggestions that will rotate in the search bar placeholder. Each line will be displayed as a separate placeholder.', 'semantix-ai-search'); ?></p>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row"><?php echo esc_html__('Placeholder Suggestions', 'semantix-ai-search'); ?></th>
                        <td>
                            <textarea name="semantix_placeholders" rows="10" cols="50" class="large-text" form="semantix-placeholders-form"><?php echo esc_textarea($placeholders); ?></textarea>
                            <p class="description"><?php echo esc_html__('Enter each placeholder text on a new line. These will rotate automatically.', 'semantix-ai-search'); ?></p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row"><?php echo esc_html__('Rotation Speed', 'semantix-ai-search'); ?></th>
                        <td>
                            <input type="number" name="semantix_placeholder_speed" value="<?php echo esc_attr($placeholder_speed); ?>" min="1000" step="500" form="semantix-placeholders-form" />
                            <p class="description"><?php echo esc_html__('Time in milliseconds between placeholder changes (1000 = 1 second)', 'semantix-ai-search'); ?></p>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="semantix-admin-box">
                <h2><?php echo esc_html__('Placeholder Preview', 'semantix-ai-search'); ?></h2>
                <div class="semantix-preview-container" style="pointer-events:none; opacity:0.7;">
                    <?php 
                    $placeholder_lines = explode("\n", $placeholders); 
                    $placeholder_lines = array_map('trim', $placeholder_lines); 
                    $placeholder_list = implode(', ', $placeholder_lines); 
                    // Render the preview WITHOUT the input/button (just the placeholder span)
                    echo '<div class="semantix-search-wrapper"><span class="semantix-dynamic-placeholder"></span></div>';
                    ?>
                </div>
                <p class="description"><?php echo esc_html__('This preview shows how your placeholders will appear. (No input or button in preview)', 'semantix-ai-search'); ?></p>
            </div>
            <button type="submit" class="button button-primary" id="semantix-placeholders-submit" style="background:#0073aa; color:#fff; border:none; padding:8px 24px; font-size:16px; border-radius:3px; margin-top:16px;"><?php esc_html_e('Save', 'semantix-ai-search'); ?></button>
        </form>
    </div>
    <?php
}
}

if (!function_exists('semantix_search_advanced_page')) {
function semantix_search_advanced_page() {
    ?>
    <div class="wrap woocommerce semantix-admin-wrap"><h1><?php echo esc_html__('Advanced Settings', 'semantix-ai-search'); ?></h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'semantix-advanced-group' ); ?>
            
            <div class="semantix-admin-box">
                <h2><?php echo esc_html__('Search Results Template', 'semantix-ai-search'); ?></h2>
                <table class="form-table">
                     <tr valign="top">
                        <th scope="row"><?php echo esc_html__('Template Type', 'semantix-ai-search'); ?></th>
                        <td>
                            <label style="display: block; margin-bottom: 10px;">
                                <input type="radio" name="semantix_template_type" value="native" <?php checked(get_option('semantix_template_type', 'native'), 'native'); ?>>
                                <?php esc_html_e('Native WooCommerce Template', 'semantix-ai-search'); ?>
                                <p class="description"><?php esc_html_e('Uses your theme\'s built-in WooCommerce styles for search results.', 'semantix-ai-search'); ?></p>
                            </label>
                            <label style="display: block;">
                                <input type="radio" name="semantix_template_type" value="custom" <?php checked(get_option('semantix_template_type'), 'custom'); ?>>
                                <?php esc_html_e('Semantix Custom Template', 'semantix-ai-search'); ?>
                                <p class="description"><?php esc_html_e('Uses a fully custom, high-performance template. Allows customization below.', 'semantix-ai-search'); ?></p>
                            </label>
                        </td>
                    </tr>
                </table>
            </div>

            <div id="semantix_custom_template_options">
                <div class="semantix-admin-box">
                    <h2><?php esc_html_e('Custom Template Customization', 'semantix-ai-search'); ?></h2>
                    <p><?php esc_html_e('These settings only apply if "Semantix Custom Template" is selected above.', 'semantix-ai-search'); ?></p>
                    
                    <h3><?php esc_html_e('Layout & Sizing', 'semantix-ai-search'); ?></h3>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Card Width (px)', 'semantix-ai-search'); ?></th>
                            <td><input type="number" name="semantix_card_width" value="<?php echo esc_attr(get_option('semantix_card_width', '280')); ?>" /></td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Card Height (px)', 'semantix-ai-search'); ?></th>
                            <td><input type="number" name="semantix_card_height" value="<?php echo esc_attr(get_option('semantix_card_height', '420')); ?>" /></td>
                        </tr>
                         <tr valign="top">
                            <th scope="row"><?php esc_html_e('Image Height (px)', 'semantix-ai-search'); ?></th>
                            <td><input type="number" name="semantix_image_height" value="<?php echo esc_attr(get_option('semantix_image_height', '220')); ?>" /></td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Show Page Title', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="hidden" name="semantix_show_header_title" value="0" />
                                <label>
                                    <input type="checkbox" name="semantix_show_header_title" value="1" <?php checked(get_option('semantix_show_header_title', 1), 1); ?> />
                                    <?php esc_html_e('Display the "Search Results for: [query]" header title on the custom search results page.', 'semantix-ai-search'); ?>
                                </label>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Auto-Disable FiboSearch', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="hidden" name="semantix_auto_disable_fibosearch" value="0" />
                                <label>
                                    <input type="checkbox" name="semantix_auto_disable_fibosearch" value="1" <?php checked(get_option('semantix_auto_disable_fibosearch', 1), 1); ?> />
                                    <?php esc_html_e('Automatically disable FiboSearch (AJAX Search for WooCommerce) to prevent conflicts with Semantix search.', 'semantix-ai-search'); ?>
                                </label>
                                <p class="description">
                                    <?php esc_html_e('When enabled, Semantix will automatically override FiboSearch functionality to prevent search conflicts. Disable this if you want to manually manage both plugins.', 'semantix-ai-search'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>

                    <h3><?php esc_html_e('Colors', 'semantix-ai-search'); ?></h3>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Card Background', 'semantix-ai-search'); ?></th>
                            <td><input type="text" name="semantix_card_bg_color" value="<?php echo esc_attr( get_option('semantix_card_bg_color', '#ffffff') ); ?>" class="semantix-color-picker" /></td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Product Title Color', 'semantix-ai-search'); ?></th>
                            <td><input type="text" name="semantix_title_color" value="<?php echo esc_attr( get_option('semantix_title_color', '#333333') ); ?>" class="semantix-color-picker" /></td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Price Color', 'semantix-ai-search'); ?></th>
                            <td><input type="text" name="semantix_price_color" value="<?php echo esc_attr( get_option('semantix_price_color', '#2c5aa0') ); ?>" class="semantix-color-picker" /></td>
                        </tr>
                    </table>
                    
                    <!-- NEW: Typography Section -->
                    <h3><?php esc_html_e('Typography', 'semantix-ai-search'); ?></h3>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Title Font Family', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="text" name="semantix_title_font_family" value="<?php echo esc_attr( get_option('semantix_title_font_family', "'Inter', sans-serif") ); ?>" class="regular-text" />
                                <p class="description"><?php esc_html_e("e.g., 'Inter', sans-serif or 'Georgia', serif. The font must be loaded by your theme.", 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Title Font Weight', 'semantix-ai-search'); ?></th>
                            <td>
                                <select name="semantix_title_font_weight">
                                    <?php
                                    $weights = ['300' => 'Light', '400' => 'Normal', '500' => 'Medium', '600' => 'Semi-Bold', '700' => 'Bold', '800' => 'Extra-Bold'];
                                    $current_weight = get_option('semantix_title_font_weight', '600');
                                    foreach($weights as $value => $label) {
                                        echo '<option value="' . esc_attr($value) . '" ' . selected($current_weight, $value, false) . '>' . esc_html($label . ' (' . $value . ')') . '</option>';
                                    }
                                    ?>
                                </select>
                                <p class="description"><?php esc_html_e('Select the thickness of the product title.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Price Font Family', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="text" name="semantix_price_font_family" value="<?php echo esc_attr( get_option('semantix_price_font_family', "'Inter', sans-serif") ); ?>" class="regular-text" />
                                <p class="description"><?php esc_html_e("e.g., 'Inter', sans-serif or 'Lato', sans-serif. The font must be loaded by your theme.", 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Price Font Weight', 'semantix-ai-search'); ?></th>
                            <td>
                                <select name="semantix_price_font_weight">
                                    <?php
                                    $current_weight = get_option('semantix_price_font_weight', '700');
                                    foreach($weights as $value => $label) {
                                        echo '<option value="' . esc_attr($value) . '" ' . selected($current_weight, $value, false) . '>' . esc_html($label . ' (' . $value . ')') . '</option>';
                                    }
                                    ?>
                                </select>
                                <p class="description"><?php esc_html_e('Select the thickness of the product price.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="semantix-admin-box">
                    <h2><?php esc_html_e('Image Handling', 'semantix-ai-search'); ?></h2>
                    <p><?php esc_html_e('Configure how product images are handled in the custom template.', 'semantix-ai-search'); ?></p>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Maximum Image Width (px)', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="number" name="semantix_max_image_width" value="<?php echo esc_attr(get_option('semantix_max_image_width', '800')); ?>" min="200" max="2000" />
                                <p class="description"><?php esc_html_e('Images larger than this width will be automatically resized.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Maximum Image Height (px)', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="number" name="semantix_max_image_height" value="<?php echo esc_attr(get_option('semantix_max_image_height', '600')); ?>" min="200" max="2000" />
                                <p class="description"><?php esc_html_e('Images larger than this height will be automatically resized.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Fix Large Images', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="hidden" name="semantix_fix_large_images" value="0" />
                                <label>
                                    <input type="checkbox" name="semantix_fix_large_images" value="1" <?php checked(get_option('semantix_fix_large_images', false), 1); ?> />
                                    <?php esc_html_e('My image is too big for the product (enable this to fix oversized image issues)', 'semantix-ai-search'); ?>
                                </label>
                                <p class="description"><?php esc_html_e('When enabled, this will set the image width to 0 and center it in the product card to fix layout issues caused by oversized images.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="semantix-admin-box">
                    <h2><?php esc_html_e('Product Type Ribbons', 'semantix-ai-search'); ?></h2>
                    <p><?php esc_html_e('Customize the diagonal stripe ribbons that display product types.', 'semantix-ai-search'); ?></p>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Ribbon Background Color', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="text" name="semantix_ribbon_bg_color" value="<?php echo esc_attr(get_option('semantix_ribbon_bg_color', '#1a1a1a')); ?>" class="semantix-color-picker" />
                                <p class="description"><?php esc_html_e('Background color for the diagonal type ribbons.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row"><?php esc_html_e('Ribbon Text Color', 'semantix-ai-search'); ?></th>
                            <td>
                                <input type="text" name="semantix_ribbon_text_color" value="<?php echo esc_attr(get_option('semantix_ribbon_text_color', '#ffffff')); ?>" class="semantix-color-picker" />
                                <p class="description"><?php esc_html_e('Text color for the diagonal type ribbons.', 'semantix-ai-search'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="semantix-admin-box"><h2><?php echo esc_html__('Search Integration', 'semantix-ai-search'); ?></h2><table class="form-table">
            <tr valign="top"><th scope="row"><?php echo esc_html__('Auto-Replace WordPress & WooCommerce Search', 'semantix-ai-search'); ?></th><td>
                <input type="hidden" name="semantix_enable_auto_replace" value="0" />
                <label><input type="checkbox" name="semantix_enable_auto_replace" value="1" <?php checked(get_option('semantix_enable_auto_replace', 1), 1); ?> /> <?php echo esc_html__('Automatically replace default search forms', 'semantix-ai-search'); ?></label><p class="description"><?php echo esc_html__('When enabled, standard WordPress and WooCommerce search forms will be replaced.', 'semantix-ai-search'); ?></p></td></tr>
            <tr valign="top"><th scope="row"><?php echo esc_html__('Enable Autocomplete Suggestions', 'semantix-ai-search'); ?></th><td>
                <input type="hidden" name="semantix_enable_suggestions" value="0" />
                <label><input type="checkbox" name="semantix_enable_suggestions" value="1" <?php checked( get_option('semantix_enable_suggestions', 1), 1 ); ?> /> <?php echo esc_html__('Show AI-powered suggestions as users type.', 'semantix-ai-search'); ?></label><p class="description"><?php echo esc_html__('When enabled, a dropdown with product and query suggestions will appear below the search bar.', 'semantix-ai-search'); ?></p></td></tr>
            <tr valign="top"><th scope="row"><?php echo esc_html__('Custom CSS Selectors for Replacement', 'semantix-ai-search'); ?></th><td><textarea name="semantix_custom_selectors" rows="6" cols="70" class="large-text code" placeholder=".header-search, #search-form"><?php echo esc_textarea(get_option('semantix_custom_selectors', '')); ?></textarea><p class="description"><?php echo esc_html__('Add custom CSS selectors (comma or newline separated) to replace with Semantix search.', 'semantix-ai-search'); ?></p></td></tr>
        </table></div>
        <div class="semantix-admin-box"><h2><?php echo esc_html__('API Configuration', 'semantix-ai-search'); ?></h2><table class="form-table">
            <tr valign="top"><th scope="row"><?php esc_html_e( 'API Key', 'semantix-ai-search' ); ?></th><td><input type="text" name="semantix_api_key" value="<?php echo esc_attr( get_option('semantix_api_key', '') ); ?>" class="regular-text" placeholder="Paste your Semantix API key here"/><p class="description"><?php esc_html_e( 'API Key from your Semantix dashboard for autocomplete and search.', 'semantix-ai-search' ); ?></p></td></tr>
            <tr valign="top"><th scope="row"><?php echo esc_html__('API Endpoint URL (Search)', 'semantix-ai-search'); ?></th><td><input type="url" name="semantix_search_api_endpoint" value="<?php echo esc_attr(get_option('semantix_search_api_endpoint', 'https://dashboard-server-ae00.onrender.com/search')); ?>" class="regular-text" /><p class="description"><?php echo esc_html__('Endpoint for the main search results page (used by the Custom Template).', 'semantix-ai-search'); ?></p></td></tr>
            <tr valign="top"><th scope="row"><?php echo esc_html__('API Endpoint URL (Autocomplete)', 'semantix-ai-search'); ?></th><td><input type="url" name="semantix_api_endpoint" value="<?php echo esc_attr(get_option('semantix_api_endpoint', 'https://dashboard-server-ae00.onrender.com/autocomplete')); ?>" class="regular-text" /><p class="description"><?php echo esc_html__('Endpoint for the live suggestions dropdown.', 'semantix-ai-search'); ?></p></td></tr>
            <tr valign="top"><th scope="row"><?php echo esc_html__('Database Parameters', 'semantix-ai-search'); ?></th><td>
                <div class="semantix-field-group"><label><?php echo esc_html__('Database Name (dbName):', 'semantix-ai-search'); ?> <input type="text" name="semantix_dbname" value="<?php echo esc_attr(get_option('semantix_dbname', 'alcohome')); ?>" /></label></div>
                <div class="semantix-field-group"><label><?php echo esc_html__('Collection Name 1 (e.g., products):', 'semantix-ai-search'); ?> <input type="text" name="semantix_collection1" value="<?php echo esc_attr(get_option('semantix_collection1', 'products')); ?>" /></label></div>
                <div class="semantix-field-group"><label><?php echo esc_html__('Collection Name 2 (e.g., queries):', 'semantix-ai-search'); ?> <input type="text" name="semantix_collection2" value="<?php echo esc_attr(get_option('semantix_collection2', 'queries')); ?>" /></label></div>
                <p class="description"><?php echo esc_html__('These parameters are used in API calls.', 'semantix-ai-search'); ?></p>
            </td></tr>
        </table></div>
        <div class="semantix-admin-box"><h2><?php echo esc_html__('Custom CSS', 'semantix-ai-search'); ?></h2><table class="form-table">
            <tr valign="top"><th scope="row"><?php echo esc_html__('Additional CSS', 'semantix-ai-search'); ?></th><td><textarea name="semantix_custom_css" rows="10" cols="50" class="large-text code"><?php echo esc_textarea(get_option('semantix_custom_css', '')); ?></textarea><p class="description"><?php echo esc_html__('Add custom CSS to further customize search bar appearance.', 'semantix-ai-search'); ?></p></td></tr>
        </table></div>
        <?php submit_button(); ?>
        </form>
    </div>
<script>
jQuery(document).ready(function($) {
    const templateTypeRadios = $('input[name="semantix_template_type"]');
    const customOptionsContainer = $('#semantix_custom_template_options');

    function toggleCustomOptions() {
        if ($('input[name="semantix_template_type"]:checked').val() === 'custom') {
            customOptionsContainer.slideDown();
        } else {
            customOptionsContainer.slideUp();
        }
    }

    // Initial check
    toggleCustomOptions();

    // Toggle on change
    templateTypeRadios.on('change', toggleCustomOptions);

    // Init color pickers
    $('.semantix-color-picker').wpColorPicker();
});
</script>
    <?php
    }
}

if (!function_exists('semantix_register_settings')) {
    function semantix_register_settings() {
        // Placeholder settings
        register_setting('semantix-placeholders-group', 'semantix_placeholders', ['type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field']);
        register_setting('semantix-placeholders-group', 'semantix_placeholder_speed', ['type' => 'number', 'sanitize_callback' => 'absint']);

        // Advanced settings with proper checkbox handling
        register_setting('semantix-advanced-group', 'semantix_template_type', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_card_width', ['type' => 'number', 'sanitize_callback' => 'absint']);
        register_setting('semantix-advanced-group', 'semantix_card_height', ['type' => 'number', 'sanitize_callback' => 'absint']);
        register_setting('semantix-advanced-group', 'semantix_image_height', ['type' => 'number', 'sanitize_callback' => 'absint']);
        register_setting('semantix-advanced-group', 'semantix_card_bg_color', ['type' => 'string', 'sanitize_callback' => 'sanitize_hex_color']);
        register_setting('semantix-advanced-group', 'semantix_title_color', ['type' => 'string', 'sanitize_callback' => 'sanitize_hex_color']);
        register_setting('semantix-advanced-group', 'semantix_price_color', ['type' => 'string', 'sanitize_callback' => 'sanitize_hex_color']);

        // NEW: Register Typography Settings
        register_setting('semantix-advanced-group', 'semantix_title_font_family', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_title_font_weight', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_price_font_family', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_price_font_weight', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
		
        register_setting('semantix-advanced-group', 'semantix_ribbon_bg_color', ['type' => 'string', 'sanitize_callback' => 'sanitize_hex_color']);
        register_setting('semantix-advanced-group', 'semantix_ribbon_text_color', ['type' => 'string', 'sanitize_callback' => 'sanitize_hex_color']);
        register_setting('semantix-advanced-group', 'semantix_search_api_endpoint', ['type' => 'string', 'sanitize_callback' => 'esc_url_raw']);
        register_setting('semantix-advanced-group', 'semantix_enable_auto_replace', ['type' => 'boolean', 'sanitize_callback' => 'semantix_sanitize_checkbox']);
        register_setting('semantix-advanced-group', 'semantix_enable_suggestions', ['type' => 'boolean', 'sanitize_callback' => 'semantix_sanitize_checkbox']);
        register_setting('semantix-advanced-group', 'semantix_custom_selectors', ['type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field']);
        register_setting('semantix-advanced-group', 'semantix_api_key', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_api_endpoint', ['type' => 'string', 'sanitize_callback' => 'esc_url_raw']);
        register_setting('semantix-advanced-group', 'semantix_dbname', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_collection1', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_collection2', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
        register_setting('semantix-advanced-group', 'semantix_custom_css', ['type' => 'string', 'sanitize_callback' => 'wp_strip_all_tags']);
        register_setting('semantix-advanced-group', 'semantix_show_header_title', ['type' => 'boolean', 'sanitize_callback' => 'semantix_sanitize_checkbox']);
    register_setting('semantix-advanced-group', 'semantix_auto_disable_fibosearch', ['type' => 'boolean', 'sanitize_callback' => 'semantix_sanitize_checkbox']);
    }
}
add_action('admin_init', 'semantix_register_settings');

if (!function_exists('semantix_sanitize_checkbox')) {
    function semantix_sanitize_checkbox($value) {
        return $value ? 1 : 0;
    }
}

if (!function_exists('semantix_create_assets')) {
function semantix_create_assets() {
    $assets_dir = plugin_dir_path(__FILE__) . 'assets'; $css_dir = $assets_dir . '/css'; $js_dir = $assets_dir . '/js';
    if (!file_exists($assets_dir)) wp_mkdir_p($assets_dir); if (!file_exists($css_dir)) wp_mkdir_p($css_dir); if (!file_exists($js_dir)) wp_mkdir_p($js_dir);
    $css_file = $css_dir . '/admin.css'; if (!file_exists($css_file)) file_put_contents($css_file, "/* Semantix Admin Styles */ .semantix-admin-wrap { margin: 20px 20px 0 0; } .semantix-admin-box { background: #fff; border: 1px solid #c3c4c7; box-shadow: 0 1px 1px rgba(0,0,0,.04); margin-bottom: 20px; padding: 15px; } .semantix-admin-box h2 {border-bottom: 1px solid #eee; margin:0 0 15px; padding-bottom:10px; font-size:14px;} .semantix-preview-container { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin-bottom: 15px; border-radius: 4px; } /* More styles in original */");
    $js_file = $js_dir . '/admin.js'; if (!file_exists($js_file)) file_put_contents($js_file, "jQuery(document).ready(function($){ if($.fn.wpColorPicker){ $('.semantix-color-picker').wpColorPicker();} $('#semantix_copy_shortcode').on('click', function(){ /* copy logic */ }); });");
    }
}
register_activation_hook(__FILE__, 'semantix_create_assets');

if (!function_exists('semantix_settings_link')) {
function semantix_settings_link($links) {
    array_unshift($links, '<a href="admin.php?page=semantix-ai-search">' . __('Settings', 'semantix-ai-search') . '</a>');
    return $links;
    }
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'semantix_settings_link');

if (!function_exists('semantix_add_custom_css')) {
function semantix_add_custom_css() {
    $custom_css = get_option('semantix_custom_css');
    if (!empty($custom_css)) echo '<style type="text/css">' . wp_strip_all_tags( $custom_css ) . '</style>'; // Sanitize
    }
}
add_action('wp_head', 'semantix_add_custom_css');

add_action( 'wp_footer', function () {
    $api_endpoint = esc_js( get_option( 'semantix_api_endpoint', 'https://dashboard-server-ae00.onrender.com/autocomplete' ) );
    $dbname       = esc_js( get_option( 'semantix_dbname',       'alcohome' ) ); // Default from your settings
    $c1           = esc_js( get_option( 'semantix_collection1',  'products' ) );
    $c2           = esc_js( get_option( 'semantix_collection2',  'queries' ) );
    $api_key      = esc_js( get_option( 'semantix_api_key',      '' ) );
?>
<script>
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.semantix_fetchSuggestions === 'function' || typeof window.semantix_fetchSuggestions_fallback === 'function') { // Check if either exists
    const currentApiEndpoint = "<?php echo $api_endpoint; ?>";
    const currentApiKey  = "<?php echo $api_key; ?>";
    const currentDbName = "<?php echo $dbname; ?>";
    const currentC1 = "<?php echo $c1; ?>";
    const currentC2 = "<?php echo $c2; ?>";

    // This overrides any previously defined semantix_fetchSuggestions
    window.semantix_fetchSuggestions = async (query, listEl) => {
      try {
        const url = new URL(currentApiEndpoint);
        url.searchParams.set('query', query);
        url.searchParams.set('dbName', currentDbName); // Add dbName
        url.searchParams.set('collectionName1', currentC1); // Add collection1
        url.searchParams.set('collectionName2', currentC2); // Add collection2

        const headers = {};
        if (currentApiKey) { headers['x-api-key'] = currentApiKey; }

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) throw new Error('API response not OK: ' + res.status);
        const data = await res.json();
        if (typeof window.semantix_displaySuggestions === 'function') {
            window.semantix_displaySuggestions(data, listEl);
        }
      } catch (err) {
        console.warn('[Semantix] Autocomplete fetch failed:', err);
      }
    };

    if (typeof window.semantix_debounce === 'function') {
        window.semantix_debouncedFetchSuggestions =
            window.semantix_debounce(window.semantix_fetchSuggestions, 200);
    }
    console.log('[Semantix] Autocomplete fetch function updated with latest settings.');
  }
});
</script>
<?php
}, 99 );

if (!function_exists('semantix_track_search_query')) {
function semantix_track_search_query() {
    if (is_search() && get_search_query() && !is_admin()) {
        $query = get_search_query();
        $total_searches = get_option('semantix_total_searches', 0);
        $popular_searches = get_option('semantix_popular_searches', array());
        $total_searches++;
        if (isset($popular_searches[$query])) $popular_searches[$query]++; else $popular_searches[$query] = 1;
        arsort($popular_searches);
        if (count($popular_searches) > 20) $popular_searches = array_slice($popular_searches, 0, 20, true);
        update_option('semantix_total_searches', $total_searches);
        update_option('semantix_popular_searches', $popular_searches);
    }
    }
}
add_action('template_redirect', 'semantix_track_search_query');

if (!function_exists('semantix_modify_shortcode_defaults')) {
function semantix_modify_shortcode_defaults($atts) {
    $defaults = array(
        'placeholders'    => get_option('semantix_placeholders', 'יין אדום צרפתי, פירותי וקליל'),
        'placeholder_speed' => get_option('semantix_placeholder_speed', 3000)
    );
    if (strpos($defaults['placeholders'], "\n") !== false) {
        $placeholder_lines = explode("\n", $defaults['placeholders']);
        $defaults['placeholders'] = implode(', ', array_map('trim', $placeholder_lines));
    }
    // Merge $atts with $defaults, $atts values take precedence if they exist
    $atts = array_merge($defaults, $atts);
    return $atts;
}
}
add_filter('shortcode_atts_semantix_search_bar', 'semantix_modify_shortcode_defaults', 10, 3);

if (!function_exists('semantix_track_search_to_cart_query')) {
function semantix_track_search_to_cart_query() {
    if (is_search() && get_search_query() && !is_admin()) {
        $query = get_search_query();
        setcookie('semantix_last_search', sanitize_text_field($query), time() + 1800, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true); // Added httponly
        if (function_exists('session_status') && session_status() === PHP_SESSION_NONE) @session_start(); // Suppress errors if headers already sent
        if(isset($_SESSION)) $_SESSION['semantix_last_search'] = sanitize_text_field($query);
    }
    }
}
add_action('template_redirect', 'semantix_track_search_to_cart_query', 9);

// Track checkout initiation for better conversion tracking
if (!function_exists('semantix_track_checkout_initiation')) {
function semantix_track_checkout_initiation() {
    $search_query = semantix_get_search_query();
    if (!empty($search_query)) {
        $cart_items = WC()->cart->get_cart();
        $total_value = WC()->cart->get_cart_contents_total();
        
        $products_data = array();
        foreach ($cart_items as $cart_item) {
            $product = $cart_item['data'];
            $products_data[] = array(
                'product_id' => $cart_item['product_id'],
                'product_name' => $product->get_name(),
                'quantity' => $cart_item['quantity'],
                'price' => $product->get_price()
            );
        }
        
        $data = array(
            'timestamp' => time(),
            'search_query' => $search_query,
            'products' => $products_data,
            'cart_total' => $total_value,
            'cart_count' => WC()->cart->get_cart_contents_count(),
            'site_url' => home_url(),
            'event_type' => 'checkout_initiated',
            'source' => 'server_side'
        );
        semantix_send_to_mongodb($data);
    }
}
}
add_action('woocommerce_before_checkout_form', 'semantix_track_checkout_initiation');

// Also track when users click "Proceed to Checkout" button
if (!function_exists('semantix_track_add_to_cart')) {
function semantix_track_add_to_cart($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
    $search_query = semantix_get_search_query();
    if (!empty($search_query)) {
        $product = wc_get_product($product_id);
        $data = array(
            'timestamp' => time(), 'search_query' => $search_query, 'product_id' => $product_id,
            'product_name' => $product ? $product->get_name() : 'Unknown',
            'product_price' => $product ? $product->get_price() : '',
            'product_image' => $product ? wp_get_attachment_url($product->get_image_id()) : '',
            'quantity' => $quantity, 'site_url' => home_url(), 'event_type' => 'add_to_cart', 'source' => 'server_side'
        );
        semantix_send_to_mongodb($data);
    }
    }
}
add_action('woocommerce_add_to_cart', 'semantix_track_add_to_cart', 10, 6);

if (!function_exists('semantix_add_search_to_cart_script')) {
function semantix_add_search_to_cart_script() {
    if (!class_exists('WooCommerce') || is_admin()) return;
    $mongodb_api_url = 'https://dashboard-server-ae00.onrender.com/search-to-cart'; $api_key = get_option('semantix_api_key', '');
    ?>
<script>
(function($) { // Pass jQuery as $
    function getSemanticCookie(name) { var value = "; " + document.cookie; var parts = value.split("; " + name + "="); if (parts.length == 2) return decodeURIComponent(parts.pop().split(";").shift()); return "";}
    
    // Enhanced tracking function for checkout initiation
    function trackSearchToCheckoutEvent(eventType, data) {
        var lastSearch = getSemanticCookie('semantix_last_search');
        var urlParams = new URLSearchParams(window.location.search); 
        var urlSearch = urlParams.get('s');
        var searchQuery = window.location.href.includes('/?s=') && urlSearch ? urlSearch : lastSearch;
        
        if (searchQuery) {
            var trackingData = {
                timestamp: Math.floor(Date.now()/1000),
                search_query: searchQuery,
                site_url: window.location.hostname,
                event_type: eventType,
                source: 'client_side',
                ...data
            };
            
            fetch('<?php echo esc_url($mongodb_api_url); ?>', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json', 'x-api-key': '<?php echo esc_attr($api_key); ?>'}, 
                body: JSON.stringify({document: trackingData})
            })
            .then(response => { 
                if (!response.ok) throw new Error('Network response was not ok ' + response.status); 
                return response.json(); 
            })
            .then(data => console.log('Semantix tracking event saved:', eventType, data))
            .catch(error => { 
                console.error('Error saving tracking event:', error);
                // Fallback to AJAX
                $.ajax({ 
                    url: '<?php echo admin_url('admin-ajax.php'); ?>', 
                    type: 'POST', 
                    data: {
                        action: 'semantix_track_search_event', 
                        search_query: searchQuery, 
                        event_type: eventType,
                        event_data: JSON.stringify(data)
                    }, 
                    success: function(response){ 
                        console.log('Tracking event via AJAX fallback:', response);
                    }
                });
            });
        }
    }
    
    // Legacy add to cart tracking (keep for historical data)
    function trackSearchToCartEvent(productId, productName, productPrice, quantity) {
        trackSearchToCheckoutEvent('add_to_cart', {
            product_id: productId,
            product_name: productName,
            product_price: productPrice,
            quantity: quantity
        });
    }
    
    // NEW: Track checkout initiation - PRIMARY CONVERSION EVENT
    function trackCheckoutInitiation() {
        var cartData = {
            cart_total: $('.cart-subtotal .amount, .order-total .amount').first().text().trim(),
            cart_count: $('.cart-contents-count').text() || $('tbody tr').length,
            checkout_step: 'initiated'
        };
        trackSearchToCheckoutEvent('checkout_initiated', cartData);
        console.log('🎯 Checkout initiated - Primary conversion tracked!');
    }
    
    // NEW: Track checkout completion - FINAL CONVERSION EVENT  
    function trackCheckoutCompletion(orderId, orderTotal) {
        trackSearchToCheckoutEvent('checkout_completed', {
            order_id: orderId,
            order_total: orderTotal,
            checkout_step: 'completed'
        });
        console.log('🎉 Purchase completed - Final conversion tracked!');
    }
    
    // Track checkout initiation when user reaches checkout page
    if (window.location.href.includes('/checkout/') && !window.location.href.includes('/order-received/')) {
        $(document).ready(function() {
            trackCheckoutInitiation();
        });
    }
    
    // Track checkout completion on thank you page
    if (window.location.href.includes('/order-received/') || $('body').hasClass('woocommerce-order-received')) {
        $(document).ready(function() {
            var orderId = $('.woocommerce-order-overview__order strong, .order-number').text().trim();
            var orderTotal = $('.woocommerce-order-overview__total .amount, .order-total .amount').text().trim();
            trackCheckoutCompletion(orderId, orderTotal);
        });
    }
    
    // Track "Proceed to Checkout" button clicks
    $(document).on('click', 'a[href*="checkout"], .checkout-button, .wc-proceed-to-checkout a', function(e) {
        setTimeout(trackCheckoutInitiation, 100); // Small delay to ensure cart data is available
    });
    
    // Legacy add to cart tracking (keep existing functionality)
    $(document).on('added_to_cart', function(event, fragments, cart_hash, $button) {
        if (!$button || !$button.length) return;
        var productId = $button.data('product_id'); 
        var productName = $button.closest('.product').find('.woocommerce-loop-product__title').text() || $button.closest('.product-container').find('.product-name').text() || 'N/A'; 
        var quantity = $button.data('quantity') || 1; 
        var productPrice = ($button.closest('.product').find('.price .amount').first().text() || '').trim();
        trackSearchToCartEvent(productId, productName, productPrice, quantity);
    });
    
    $(document).on('click', '.add_to_cart_button', function(e) { 
        if (window.location.href.includes('/?s=')) { 
            var urlParams = new URLSearchParams(window.location.search); 
            var searchQuery = urlParams.get('s'); 
            if (searchQuery) { 
                document.cookie = "semantix_last_search=" + encodeURIComponent(searchQuery) + "; path=/; max-age=1800; SameSite=Lax";
            }
        }
    });
    
    $('form.cart').on('submit', function(e) { 
        var searchQuery = getSemanticCookie('semantix_last_search'); 
        if (searchQuery) { 
            var productId = $('input[name="product_id"]').val() || $('button[name="add-to-cart"]').val(); 
            var productName = $('.product_title').text(); 
            var quantity = $('input.qty').val() || 1; 
            var productPrice = ($('.price .amount').first().text() || '').trim(); 
            setTimeout(function(){ 
                trackSearchToCartEvent(productId, productName, productPrice, quantity); 
            }, 100);
        }
    });
})(jQuery);
</script>
    <?php
    }
}
add_action('wp_footer', 'semantix_add_search_to_cart_script', 99);

if (!function_exists('semantix_clear_storage_script')) {
    function semantix_clear_storage_script() {
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                try {
                    const keys = Object.keys(localStorage);
                    const wc_fragment_keys = keys.filter(key => key.startsWith('wc_fragments_'));
                    
                    if (wc_fragment_keys.length) {
                        console.log('Clearing WooCommerce fragment cache...');
                        wc_fragment_keys.forEach(key => {
                            localStorage.removeItem(key);
                        });
                        console.log('WooCommerce fragment cache cleared.');
                    }
                } catch (e) {
                    console.error('Could not clear WooCommerce fragment cache:', e);
                }
            });
        </script>
        <?php
    }
}
add_action('wp_footer', 'semantix_clear_storage_script', 100);

if (!function_exists('semantix_ajax_search_to_cart_callback')) {
function semantix_ajax_search_to_cart_callback() {
    check_ajax_referer( 'semantix_track_search_to_cart_nonce', 'security' ); // Add nonce check if sending nonce from JS
    $search_query = isset($_POST['search_query']) ? sanitize_text_field($_POST['search_query']) : ''; $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0; $product_name = isset($_POST['product_name']) ? sanitize_text_field($_POST['product_name']) : ''; $product_price = isset($_POST['product_price']) ? sanitize_text_field($_POST['product_price']) : ''; $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
    if (!empty($search_query) && !empty($product_id)) {
        $result = semantix_send_to_mongodb(array('timestamp' => time(), 'search_query' => $search_query, 'product_id' => $product_id, 'product_name' => $product_name, 'product_price' => $product_price, 'quantity' => $quantity, 'site_url' => home_url(), 'event_type' => 'add_to_cart', 'source' => 'ajax_fallback')); // home_url() is safer
        if ($result) wp_send_json_success('Search to cart event sent to MongoDB'); else wp_send_json_error('Failed to send data to MongoDB');
    } else wp_send_json_error('Missing required data');
    wp_die();
    }
}
add_action('wp_ajax_semantix_track_search_to_cart', 'semantix_ajax_search_to_cart_callback');
add_action('wp_ajax_nopriv_semantix_track_search_to_cart', 'semantix_ajax_search_to_cart_callback');

// New AJAX handler for enhanced tracking events
add_action('wp_ajax_semantix_track_search_event', 'semantix_ajax_search_event_callback');
add_action('wp_ajax_nopriv_semantix_track_search_event', 'semantix_ajax_search_event_callback');

if (!function_exists('semantix_ajax_search_event_callback')) {
function semantix_ajax_search_event_callback() {
    $search_query = isset($_POST['search_query']) ? sanitize_text_field($_POST['search_query']) : '';
    $event_type = isset($_POST['event_type']) ? sanitize_text_field($_POST['event_type']) : '';
    $event_data_json = isset($_POST['event_data']) ? stripslashes($_POST['event_data']) : '{}';
    $event_data = json_decode($event_data_json, true);
    
    if (!empty($search_query) && !empty($event_type)) {
        $data = array(
            'timestamp' => time(),
            'search_query' => $search_query,
            'event_type' => $event_type,
            'site_url' => home_url(),
            'source' => 'ajax_fallback'
        );
        
        // Merge in the event-specific data
        if (is_array($event_data)) {
            $data = array_merge($data, $event_data);
        }
        
        $result = semantix_send_to_mongodb($data);
        if ($result) {
            wp_send_json_success('Search event sent to MongoDB: ' . $event_type);
        } else {
            wp_send_json_error('Failed to send data to MongoDB');
        }
    } else {
        wp_send_json_error('Missing required data');
    }
    wp_die();
}
}

if (!function_exists('semantix_get_search_query')) {
function semantix_get_search_query() {
    $search_query = '';
    if (function_exists('session_status') && session_status() === PHP_SESSION_NONE && !headers_sent()) @session_start();
    if (isset($_SESSION['semantix_last_search'])) $search_query = sanitize_text_field($_SESSION['semantix_last_search']);
    elseif (isset($_COOKIE['semantix_last_search'])) $search_query = sanitize_text_field($_COOKIE['semantix_last_search']);
    return $search_query;
    }
}

if (!function_exists('semantix_send_to_mongodb')) {
function semantix_send_to_mongodb($data) {
    $mongodb_api_url = 'https://dashboard-server-ae00.onrender.com/search-to-cart'; $api_key = get_option('semantix_api_key', '');
    $response = wp_remote_post($mongodb_api_url, array('headers' => array('Content-Type' => 'application/json', 'x-api-key' => $api_key), 'body' => json_encode(array('document' => $data)), 'timeout' => 15, 'data_format' => 'body'));
    if (is_wp_error($response)) { error_log('Semantix: Error sending to MongoDB: ' . $response->get_error_message()); return false; }
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200 && $response_code !== 201) { error_log('Semantix: Error response from MongoDB API: ' . $response_code . ' Body: ' . wp_remote_retrieve_body($response)); return false; }
    return true;
    }
}

add_action('woocommerce_loop_add_to_cart_link', 'semantix_add_search_data_to_add_to_cart', 10, 2);
if (!function_exists('semantix_add_search_data_to_add_to_cart')) {
function semantix_add_search_data_to_add_to_cart($html, $product_obj) { // Parameter is WC_Product
    if (is_search() && !is_admin()) {
        $search_query = get_search_query();
        if (!empty($search_query)) {
            // It's better to add data attributes to the link itself than modifying classes extensively
            $html = str_replace('<a ', '<a data-semantix-search-query="' . esc_attr($search_query) . '" ', $html);
        }
    }
    return $html;
    }
}
add_action('wp_ajax_semantix_get_product_details', 'semantix_get_product_details_ajax');
add_action('wp_ajax_nopriv_semantix_get_product_details', 'semantix_get_product_details_ajax');

if (!function_exists('semantix_get_product_details_ajax')) {
function semantix_get_product_details_ajax() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'semantix_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'), 403);
        wp_die();
    }

    $product_ids_json = isset($_POST['product_ids']) ? stripslashes($_POST['product_ids']) : '[]';
    $product_ids_arr = json_decode($product_ids_json, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($product_ids_arr)) {
        wp_send_json_error(array('message' => 'Invalid product IDs format.'), 400);
        wp_die();
    }

    $product_details = array();

    foreach ($product_ids_arr as $product_id) {
        $product_id = intval($product_id);
        $product = wc_get_product($product_id);

        if ($product && $product->is_visible()) {
            $image_id = $product->get_image_id();
            $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'medium') : '';
            
            $product_details[$product_id] = array(
                'id' => $product_id,
                'name' => $product->get_name(),
                'price' => $product->get_price_html(),
                'regular_price' => $product->get_regular_price(),
                'sale_price' => $product->get_sale_price(),
                'image' => $image_url,
                'url' => get_permalink($product_id),
                'in_stock' => $product->is_in_stock(),
                'stock_quantity' => $product->get_stock_quantity(),
                'sku' => $product->get_sku(),
                'short_description' => $product->get_short_description(),
                'categories' => wp_get_post_terms($product_id, 'product_cat', array('fields' => 'names')),
                'tags' => wp_get_post_terms($product_id, 'product_tag', array('fields' => 'names')),
                'featured' => $product->is_featured(),
                'on_sale' => $product->is_on_sale(),
                'purchasable' => $product->is_purchasable(),
                'add_to_cart_url' => $product->add_to_cart_url(),
                'add_to_cart_text' => $product->add_to_cart_text()
            );
        }
    }

    wp_send_json_success($product_details);
    wp_die();
    }
}

/**
 * Enhanced version that also handles add to cart functionality
 */
add_action('wp_ajax_semantix_add_to_cart', 'semantix_add_to_cart_ajax');
add_action('wp_ajax_nopriv_semantix_add_to_cart', 'semantix_add_to_cart_ajax');

if (!function_exists('semantix_add_to_cart_ajax')) {
function semantix_add_to_cart_ajax() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'semantix_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'), 403);
        wp_die();
    }

    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
    $variation_id = isset($_POST['variation_id']) ? intval($_POST['variation_id']) : 0;

    if (!$product_id) {
        wp_send_json_error(array('message' => 'Invalid product ID.'), 400);
        wp_die();
    }

    $product = wc_get_product($product_id);
    if (!$product || !$product->is_purchasable()) {
        wp_send_json_error(array('message' => 'Product not available for purchase.'), 400);
        wp_die();
    }

    // Add to cart
    $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id);

    if ($cart_item_key) {
        // Get updated cart data
        $cart_data = array(
            'cart_count' => WC()->cart->get_cart_contents_count(),
            'cart_total' => WC()->cart->get_cart_total(),
            'cart_url' => wc_get_cart_url()
        );

        wp_send_json_success(array(
            'message' => 'Product added to cart successfully!',
            'cart_data' => $cart_data,
            'cart_item_key' => $cart_item_key
        ));
    } else {
        wp_send_json_error(array('message' => 'Failed to add product to cart.'), 500);
    }

    wp_die();
    }
}

/**
 * AJAX handler for "Load More" button
 */
add_action( 'wp_ajax_semantix_load_more_products', 'semantix_load_more_products_ajax' );
add_action( 'wp_ajax_nopriv_semantix_load_more_products', 'semantix_load_more_products_ajax' );

if (!function_exists('semantix_load_more_products_ajax')) {
function semantix_load_more_products_ajax() {
    // Verify nonce
    if ( ! isset($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'semantix_load_more' ) ) {
        wp_send_json_error( array( 'message' => 'Security check failed' ), 403 );
    }
    
    $product_ids_json = isset( $_POST['product_ids'] ) ? stripslashes( $_POST['product_ids'] ) : '[]';
    $highlight_map_json = isset( $_POST['highlight_map'] ) ? stripslashes( $_POST['highlight_map'] ) : '{}';
    $explanation_map_json = isset( $_POST['explanation_map'] ) ? stripslashes( $_POST['explanation_map'] ) : '{}';
    
    $product_ids = json_decode( $product_ids_json, true );
    $highlight_map = json_decode( $highlight_map_json, true );
    $explanation_map = json_decode( $explanation_map_json, true );
    
    if ( empty( $product_ids ) || ! is_array( $product_ids ) ) {
        wp_send_json_error( array( 'message' => 'Invalid product IDs' ), 400 );
    }
    
    // Setup WooCommerce loop
    $columns = (int) wc_get_theme_support( 'product_grid::default_columns', 4 );
    
    wc_setup_loop( array(
        'name' => 'semantix_load_more',
        'columns' => $columns,
        'is_shortcode' => false,
        'is_paginated' => false,
        'total' => count( $product_ids ),
    ) );
    
    // Query products
    $products_query = new WP_Query( array(
        'post_type'           => 'product',
        'post_status'         => 'publish',
        'post__in'            => $product_ids,
        'orderby'             => 'post__in',
        'posts_per_page'      => -1,
        'ignore_sticky_posts' => 1,
    ) );
    
    // Add explanation hook if needed
    if ( ! empty( $explanation_map ) ) {
        add_action( 'woocommerce_after_shop_loop_item_title', function() use ( $explanation_map ) {
            static $rendered = array();
            $pid = get_the_ID();
            
            if ( isset( $rendered[ $pid ] ) ) return;
            
            if ( $pid && isset( $explanation_map[ $pid ] ) && $explanation_map[ $pid ] !== '' ) {
                $text = wp_kses( $explanation_map[ $pid ], array(
                    'br' => array(), 
                    'em' => array(), 
                    'strong' => array(), 
                    'span' => array( 'class' => array() )
                ) );
                $rendered[ $pid ] = true;
                ?>
                <div class="semantix-product-explanation">
                    <span class="semantix-ai-icon">✨</span>
                    <span class="semantix-explanation-text"><?php echo $text; ?></span>
                </div>
                <?php
            }
        }, 999 );
    }
    
    // Render products
    ob_start();
    
    if ( $products_query->have_posts() ) {
        while ( $products_query->have_posts() ) {
            $products_query->the_post();
            wc_get_template_part( 'content', 'product' );
        }
    }
    
    $html = ob_get_clean();
    wp_reset_postdata();
    wc_reset_loop();
    
    // Return response
    wp_send_json_success( array(
        'html' => $html,
        'count' => $products_query->found_posts
    ) );
} 
}
/**
 * Clear Semantix SSR cache
 * Useful for debugging or when products are updated
 */
if (!function_exists('semantix_clear_ssr_cache')) {
function semantix_clear_ssr_cache( $query = '' ) {
    global $wpdb;
    
    if ( ! empty( $query ) ) {
        // Clear specific query cache
        $dbname = get_option( 'semantix_dbname', 'alcohome' );
        $cache_key = 'semantix_ssr_' . md5( $query . $dbname );
        delete_transient( $cache_key );
        error_log( 'Semantix SSR: Cleared cache for query: ' . $query );
    } else {
        // Clear all Semantix SSR caches
        $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_semantix_ssr_%' 
             OR option_name LIKE '_transient_timeout_semantix_ssr_%'"
        );
        error_log( 'Semantix SSR: Cleared all SSR caches' );
    }
}
}

/**
 * AJAX handler to clear SSR cache (for admin use)
 */
add_action( 'wp_ajax_semantix_clear_ssr_cache', 'semantix_clear_ssr_cache_ajax' );

if (!function_exists('semantix_clear_ssr_cache_ajax')) {
function semantix_clear_ssr_cache_ajax() {
    // Verify nonce
    if ( ! isset($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'semantix_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Security check failed' ), 403 );
    }
    
    // Check user permissions
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( array( 'message' => 'Insufficient permissions' ), 403 );
    }
    
    semantix_clear_ssr_cache();
    
    wp_send_json_success( array( 'message' => 'SSR cache cleared successfully' ) );
}
}

/**
 * Clear SSR cache when products are updated
 */
add_action( 'woocommerce_update_product', 'semantix_clear_ssr_cache_on_product_update' );
add_action( 'woocommerce_new_product', 'semantix_clear_ssr_cache_on_product_update' );

if (!function_exists('semantix_clear_ssr_cache_on_product_update')) {
function semantix_clear_ssr_cache_on_product_update( $product_id ) {
    // Clear all SSR caches when a product is updated
    // This ensures search results always show current data
    semantix_clear_ssr_cache();
    }
}

/**
 * 🧪 TEMPORARY DIAGNOSTIC HOOKS - Remove after testing
 */
add_action( 'woocommerce_after_shop_loop', function() {
    echo '<!-- 🧪 HOOK TEST: woocommerce_after_shop_loop fired! -->';
}, 1 );

add_action( 'woocommerce_after_main_content', function() {
    echo '<!-- 🧪 HOOK TEST: woocommerce_after_main_content fired! -->';
}, 1 );

add_action( 'wp_footer', function() {
    if ( is_search() ) {
        echo '<!-- 🧪 HOOK TEST: wp_footer on search page -->';
        global $semantix_ai_metadata;
        if ( ! empty( $semantix_ai_metadata ) ) {
            $product_count = isset( $semantix_ai_metadata['all_product_ids'] ) ? count( $semantix_ai_metadata['all_product_ids'] ) : 0;
            echo '<!-- 🧪 HOOK TEST: semantix_ai_metadata exists with ' . $product_count . ' products -->';
            echo '<!-- 🧪 HOOK TEST: current_page=' . ( isset( $semantix_ai_metadata['current_page'] ) ? $semantix_ai_metadata['current_page'] : 'N/A' ) . ' -->';
            echo '<!-- 🧪 HOOK TEST: per_page=' . ( isset( $semantix_ai_metadata['per_page'] ) ? $semantix_ai_metadata['per_page'] : 'N/A' ) . ' -->';
            echo '<!-- 🧪 HOOK TEST: total_products=' . ( isset( $semantix_ai_metadata['total_products'] ) ? $semantix_ai_metadata['total_products'] : 'N/A' ) . ' -->';
        } else {
            echo '<!-- 🧪 HOOK TEST: semantix_ai_metadata is EMPTY -->';
        }
    }
}, 999 );

?>