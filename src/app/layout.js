import { Inter } from "next/font/google"; 
import Link from 'next/link';
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";
import HeaderAuthButton from "./HeaderAuthButton.js";
import { validatePaddleEnvironment } from "/lib/env-validator";
import GetStartedButton from "./GetStartedButton.js";
import ConditionalFooter from "./ConditionalFooter.js";

// Run environment validation on server-side
if (typeof window === 'undefined') {
  console.log('\n🚀 Server-side initialization');
  validatePaddleEnvironment();
}

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Semantix - חיפוש סמנטי מבוסס בינה מלאכותית לתוצאות מדויקות בעסק שלך",
  description: "מנוע החיפוש המתקדם ביותר בעולם עבור חנויות מסחר אלקטרוני בכל הפלטפורמות",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <Script
          async src="https://www.googletagmanager.com/gtag/js?id=G-BLXY1X669N"
        />
        <Script id="google-analytics">
          {`
              window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8KT8DK42GV');
          `}
        </Script>
        
        {/* Shopify App Bridge Script - Add this to enable app embedding */}
        <Script 
          id="shopify-app-bridge" 
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js" 
          data-api-key={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ed3834d550c5d814851e0ad46493ca2c'}
          strategy="beforeInteractive"
        />
        
        {/* Session Token Authentication Script */}
        <Script id="shopify-app-bridge-init">
          {`
            if (window.shopify && window.shopify.config) {
              var AppBridge = window['app-bridge'];
              var createApp = AppBridge.default;
              var app = createApp({
                apiKey: '${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ed3834d550c5d814851e0ad46493ca2c'}',
                host: window.shopify.config.host,
                forceRedirect: true
              });
              
              // Set up session token handling
              var SessionToken = AppBridge.actions.SessionToken;
              var sessionToken = SessionToken.create(app);
              
              // Listen for session token changes
              sessionToken.subscribe(function(payload) {
                // Store the token for API calls
                window.sessionToken = payload.data;
              });
            }
          `}
        </Script>
        
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content="חיפוש סמנטי, בינה מלאכותית, semantix, תוצאות מדויקות, חיפוש עסקי, חיפוש חכם" />
        <meta name="author" content="semantix"/>

        
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.semantix-ai.com" />
        <meta property="og:image" content="/main-logo.png" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content="/main-logo.png" />
        <meta name="robots" content="noimageindex" />
        <meta name="googlebot" content="noimageindex" />
        
        
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        
        
        <title>{metadata.title}</title>
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-white`}>
        {/* Professional Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg z-50 border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Main Nav Links */}
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center">
                  <img src="/main-logo.svg" alt="Semantix - חיפוש סמנטי מבוסס בינה מלאכותית לתוצאות מדויקות בעסק שלך" className="h-12 w-auto [&>path]:fill-purple-600" style={{ filter: "none" }} />
                </Link>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-4">
                <Providers>
                  <HeaderAuthButton />
                </Providers>
                <Providers>
                  <GetStartedButton />
                </Providers>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content with padding for fixed nav */}
        <div className="flex-grow relative overflow-hidden pt-16">
          <main className="flex-grow relative z-10">
            <Providers>{children}</Providers>
          </main>

          <ConditionalFooter />
        </div>
      </body>
    </html>
  );
}