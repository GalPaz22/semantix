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
add_filter( 'template_include', 'semantix_native_search_template', 99 );

if (!function_exists('semantix_native_search_template')) {
function semantix_native_search_template( $template ) {
    if ( is_search() && !is_admin() ) {
        $template_type = get_option('semantix_template_type', 'native');

        if ($template_type === 'custom') {
            $custom_template = plugin_dir_path( __FILE__ ) . 'templates/search-custom-template.php';
            if ( file_exists( $custom_template ) ) {
                return $custom_template;
            }
        }

        // Fallback to the original 'native' custom template if it exists,
        // otherwise return the theme's default search.php.
        $native_template = plugin_dir_path( __FILE__ ) . 'templates/search-custom.php';
        if ( file_exists( $native_template ) ) {
            return $native_template;
        }
    }
    return $template;
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

?>