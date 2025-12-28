<?php
/**
 * Template Name: Semantix AI – Server-Side Rendered Search Results
 * Description: Products are fetched and rendered server-side for maximum performance and reliability
 * File: search-ssr.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Get AI products from global (set in semantix_native_search_template)
global $semantix_ai_products;

if ( empty( $semantix_ai_products ) || ! is_array( $semantix_ai_products ) ) {
    // Fallback to theme's default search template
    get_template_part( 'search' );
    return;
}

// Extract product data
$product_ids = array();
$highlight_map = array();
$explanation_map = array();

foreach ( $semantix_ai_products as $product ) {
    if ( isset( $product['id'] ) ) {
        $pid = intval( $product['id'] );
        if ( $pid > 0 ) {
            $product_ids[] = $pid;
            
            // Store highlight status
            if ( ! empty( $product['highlight'] ) ) {
                $highlight_map[ $pid ] = true;
            }
            
            // Store AI explanation
            if ( ! empty( $product['explanation'] ) ) {
                $explanation_map[ $pid ] = sanitize_text_field( $product['explanation'] );
            }
        }
    }
}

// If no valid product IDs, show error
if ( empty( $product_ids ) ) {
    get_header();
    ?>
    <div class="woocommerce">
        <div class="woocommerce-info">לא נמצאו מוצרים מתאימים לחיפוש שלך.</div>
    </div>
    <?php
    get_footer();
    return;
}

get_header();

$search_query = get_search_query();
?>

<style>
/* ===== MINIMAL STYLING - LET WOOCOMMERCE HANDLE EVERYTHING ===== */

.semantix-ssr-wrapper {
    max-width: inherit;
    margin: 0;
    padding: 0;
}

/* Simple header styling */
.semantix-ssr-header {
    direction: rtl;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px 0 15px 0;
    border-bottom: 1px solid #eee;
}

.semantix-ssr-title {
    font-size: 24px;
    margin: 0;
    color: inherit;
    font-family: inherit;
    padding-right: 15px;
}

.semantix-ssr-count {
    font-size: 16px;
    color: #666;
    margin: 8px 0 0 0;
}

.semantix-powered-logo {
    opacity: 0.7;
    transition: opacity 0.3s ease;
    padding-left: 15px;
}

.semantix-powered-logo:hover {
    opacity: 1;
}

/* AI Perfect Match Badge */
<?php if ( ! empty( $highlight_map ) ) : ?>
    <?php foreach ( array_keys( $highlight_map ) as $hid ) : ?>
        .post-<?php echo esc_attr( $hid ); ?> {
            position: relative;
            margin-bottom: 35px;
        }
        .post-<?php echo esc_attr( $hid ); ?>::before {
            content: "✨ AI PERFECT MATCH ✨";
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: #000;
            color: #fff;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: .75rem;
            font-weight: 600;
            z-index: 15;
            border: 1px solid #333;
            white-space: nowrap;
            min-width: 160px;
            text-align: center;
        }
    <?php endforeach; ?>
<?php endif; ?>

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

/* ===== RESPONSIVE HEADER ONLY ===== */
@media (max-width: 768px) {
    .semantix-ssr-header {
        flex-direction: column;
        text-align: center;
        gap: 15px;
    }
    .semantix-ssr-title {
        font-size: 20px;
    }
}
</style>

<div class="semantix-ssr-wrapper">
    <div class="semantix-ssr-header">
        <div>
            <h1 class="semantix-ssr-title">
                <?php echo esc_html( sprintf( 'תוצאות חיפוש עבור: "%s"', $search_query ) ); ?>
            </h1>
            <p class="semantix-ssr-count">
                <?php echo esc_html( sprintf( 'נמצאו %d תוצאות', count( $product_ids ) ) ); ?>
            </p>
        </div>
        <a href="https://semantix.co.il" target="_blank" class="semantix-powered-logo" rel="noopener">
            <img src="https://semantix-ai.com/powered.png" alt="Semantix logo" width="120" loading="lazy">
        </a>
    </div>

    <div class="woocommerce">
        <?php
        // Set up WooCommerce loop context
        $columns = (int) wc_get_theme_support( 'product_grid::default_columns' );
        if ( ! $columns ) {
            $columns = (int) wc_get_default_products_per_row();
            if ( ! $columns ) {
                $columns = 4;
            }
        }

        wc_setup_loop( array(
            'name'         => 'semantix_ssr_search',
            'columns'      => $columns,
            'is_shortcode' => false,
            'is_paginated' => false,
            'total'        => count( $product_ids ),
            'per_page'     => count( $product_ids ),
            'current_page' => 1,
        ) );

        // Query products in the order returned by AI
        $products_query = new WP_Query( array(
            'post_type'           => 'product',
            'post_status'         => array( 'publish' ), // Only published products for SSR
            'post__in'            => $product_ids,
            'orderby'             => 'post__in', // Preserve AI ranking
            'posts_per_page'      => -1,
            'ignore_sticky_posts' => 1,
        ) );

        // Hook to inject AI explanations below product title
        if ( ! empty( $explanation_map ) ) {
            add_action( 'woocommerce_after_shop_loop_item_title', function() use ( $explanation_map ) {
                $pid = get_the_ID();
                if ( $pid && isset( $explanation_map[ $pid ] ) && $explanation_map[ $pid ] !== '' ) {
                    $allowed = array(
                        'br'     => array(),
                        'em'     => array(),
                        'strong' => array(),
                        'span'   => array( 'class' => array() ),
                    );
                    $text = wp_kses( $explanation_map[ $pid ], $allowed );
                    ?>
                    <div class="semantix-product-explanation">
                        <span class="semantix-ai-icon">✨</span>
                        <span class="semantix-explanation-text"><?php echo $text; ?></span>
                    </div>
                    <?php
                }
            }, 999 );
        }

        // Render products using native WooCommerce templates
        if ( $products_query->have_posts() ) {
            woocommerce_product_loop_start();

            while ( $products_query->have_posts() ) {
                $products_query->the_post();
                
                /**
                 * Hook: woocommerce_shop_loop
                 * 
                 * This is where WooCommerce renders each product card
                 * using the theme's content-product.php template
                 */
                wc_get_template_part( 'content', 'product' );
            }

            woocommerce_product_loop_end();
        } else {
            // No products found (shouldn't happen, but just in case)
            wc_get_template( 'loop/no-products-found.php' );
        }

        // Cleanup
        wp_reset_postdata();
        wc_reset_loop();
        ?>
    </div>
</div>

<?php
get_footer();
?>

