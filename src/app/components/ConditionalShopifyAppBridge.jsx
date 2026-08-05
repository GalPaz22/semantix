'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const SHOPIFY_API_KEY =
  process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ed3834d550c5d814851e0ad46493ca2c';

function ShopifyAppBridgeInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const host = searchParams.get('host');

  const isShopifyContext =
    Boolean(host) || pathname?.startsWith('/install-shopify-app');

  if (!isShopifyContext) {
    return null;
  }

  return (
    <>
      {/* App Bridge must be synchronous — use a plain script tag, not next/script async */}
      <script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={SHOPIFY_API_KEY}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (window.shopify && window.shopify.config) {
              var AppBridge = window['app-bridge'];
              var createApp = AppBridge.default;
              var app = createApp({
                apiKey: '${SHOPIFY_API_KEY}',
                host: window.shopify.config.host,
                forceRedirect: true
              });

              var SessionToken = AppBridge.actions.SessionToken;
              var sessionToken = SessionToken.create(app);

              sessionToken.subscribe(function(payload) {
                window.sessionToken = payload.data;
              });
            }
          `,
        }}
      />
    </>
  );
}

export default function ConditionalShopifyAppBridge() {
  return (
    <Suspense fallback={null}>
      <ShopifyAppBridgeInner />
    </Suspense>
  );
}
