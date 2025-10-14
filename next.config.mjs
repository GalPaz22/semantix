/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'alcohome.co.il',
      'shipi.b-cdn.net',
      'theydream-online.com',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)', // Applies to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // everything else can run from your own origin
              "default-src 'self'",

              // scripts: Paddle live+sandbox + ProfitWell + Google Analytics + Shopify
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' " +
                "https://cdn.paddle.com https://js.paddle.com https://buy.paddle.com " +
                "https://sandbox-cdn.paddle.com https://public.profitwell.com https://www.googletagmanager.com " +
                "https://cdn.shopify.com",

              // styles: allow Paddle CSS (live + sandbox)
              "style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com https://fonts.googleapis.com",

              // images: your own + Paddle assets + your specified image domains
              "img-src 'self' data: blob: https: https://paddle.s3.amazonaws.com https://paddle-static.s3.amazonaws.com " +
                "https://alcohome.co.il https://shipi.b-cdn.net https://theydream-online.com " +
                "https://media.getmood.io https://cdn.shopify.com https://*.shopify.com " +
                "https://*.shopifycdn.com https://*.cloudinary.com https://*.cloudfront.net " +
                "https://*.amazonaws.com https://*.b-cdn.net https://*.imgix.net " +
                "https://*.fastly.com https://*.akamaized.net https://*.googleusercontent.com " +
                "https://*.fbcdn.net https://*.cdninstagram.com https://*.twimg.com " +
                "https://*.gravatar.com https://*.wp.com https://*.wixstatic.com " +
                "https://*.squarespace.com https://*.unsplash.com https://*.pexels.com",

              // fonts: Paddle webfonts
              "font-src 'self' data: https://cdn.paddle.com https://fonts.gstatic.com",

              // XHR/websocket/etc: Paddle APIs + your servers + Google Analytics + external image sources
              "connect-src 'self' https: http://localhost:* http://127.0.0.1:* blob: " +
                "https://checkout.paddle.com https://buy.paddle.com " +
                "https://vendors.paddle.com https://sandbox-vendors.paddle.com " +
                "https://api.paddle.com https://sandbox-api.paddle.com " +
                "https://dashboard-server-ae00.onrender.com https://shopifyserver-1.onrender.com " +
                "https://*.google-analytics.com https://region1.google-analytics.com",

              // iframes: allow the overlay host (live + sandbox)
              "frame-src 'self' https://checkout.paddle.com https://buy.paddle.com https://sandbox-buy.paddle.com https://js.paddle.com",

              // who can embed *you* (unchanged)
              "frame-ancestors 'self' https://checkout.paddle.com https://buy.paddle.com",

              // extra lockdown
              "object-src 'none'", // If CSV download (blob:) is ever blocked by this, you might need "object-src 'self' blob:"
              "base-uri 'self'",
            ].join('; '),
          },
          // You can add other security headers here if needed, for example:
          // {
          //   key: 'X-Content-Type-Options',
          //   value: 'nosniff',
          // },
          // {
          //   key: 'X-Frame-Options',
          //   value: 'SAMEORIGIN', // Or DENY if you don't want it iframed at all
          // },
          // {
          //   key: 'X-XSS-Protection',
          //   value: '1; mode=block',
          // },
          // {
          //   key: 'Referrer-Policy',
          //   value: 'strict-origin-when-cross-origin',
          // },
          // {
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=63072000; includeSubDomains; preload', // Be careful with preload
          // }
        ],
      },
    ]
  },
}

export default nextConfig

