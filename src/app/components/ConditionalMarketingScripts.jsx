'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';

const GA_ID = 'G-BLXY1X669N';

function isDashboardRoute(pathname) {
  return pathname?.startsWith('/dashboard');
}

export default function ConditionalMarketingScripts() {
  const pathname = usePathname();

  // Skip third-party analytics in local/dev — they fight CSP, spam the console,
  // and add nothing useful while iterating on the site.
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (isDashboardRoute(pathname)) {
    return null;
  }

  return (
    <>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <Script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <Script id="hotjar-csq" strategy="afterInteractive">
        {`
          (function() {
            var consent = localStorage.getItem('cookieConsent');
            if (!consent) return;
            try {
              var preferences = JSON.parse(consent);
              if (!preferences.analytics) return;
              (function (c, s, q, u, a, r, e) {
                c.hj=c.hj||function(){(c.hj.q=c.hj.q||[]).push(arguments)};
                c._hjSettings = { hjid: a };
                r = s.getElementsByTagName('head')[0];
                e = s.createElement('script');
                e.async = true;
                e.src = q + c._hjSettings.hjid + u;
                r.appendChild(e);
              })(window, document, 'https://static.hj.contentsquare.net/c/csq-', '.js', 5337813);
            } catch (e) {
              console.error('Error loading Hotjar:', e);
            }
          })();
        `}
      </Script>
    </>
  );
}
