import { Heebo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { validatePaddleEnvironment } from "/lib/env-validator";
import ConditionalFooter from "./components/ConditionalFooter.js";
import CookieConsent from "./components/CookieConsent.js";
import MarketingAttributionCapture from "./components/MarketingAttributionCapture.jsx";
import ConditionalMarketingScripts from "./components/ConditionalMarketingScripts.jsx";
import ConditionalShopifyAppBridge from "./components/ConditionalShopifyAppBridge.jsx";
import { ConditionalMarketingNav, ConditionalMainPadding } from "./components/ConditionalSiteChrome.js";

// Run environment validation on server-side
if (typeof window === 'undefined') {
  console.log('\n🚀 Server-side initialization');
  validatePaddleEnvironment();
}

const heebo = Heebo({ subsets: ["hebrew", "latin"] });

const SITE_URL = "https://www.semantix.co.il";

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Semantix",
  url: SITE_URL,
  logo: `${SITE_URL}/main-logo.svg`,
  description:
    "Semantix בונה חיפוש לאי־קומרס שמוכר — Search Saver מציל חיפושים ללא תוצאות, ו־Semantix Search מפעיל את חוויית החיפוש המלאה בחנות.",
  sameAs: ["https://www.linkedin.com/company/semantix-io/"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "Sales@semantix-ai.com",
    contactType: "sales",
  },
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Semantix | חיפוש לאי־קומרס שמוכר",
    template: "%s",
  },
  description:
    "Semantix בונה חיפוש לאי־קומרס שמוכר — Search Saver מציל חיפושים ללא תוצאות, ו־Semantix Search מפעיל את חוויית החיפוש המלאה בחנות.",
  keywords: [
    "חיפוש סמנטי",
    "חיפוש באתר",
    "חיפוש לאיקומרס",
    "חיפוש AI",
    "חיפושים ללא תוצאות",
    "מנוע חיפוש לחנות",
    "Search Saver",
    "הצלת חיפושים ללא תוצאות",
    "חיפוש בעברית",
    "semantix",
  ],
  authors: [{ name: "Semantix" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Semantix",
    locale: "he_IL",
    title: "Semantix | חיפוש לאי־קומרס שמוכר",
    description:
      "Semantix בונה חיפוש לאי־קומרס שמוכר — מציל חיפושים כושלים והופך כוונת קונים להכנסות.",
    images: [{ url: "/main-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Semantix | חיפוש לאי־קומרס שמוכר",
    description:
      "Semantix בונה חיפוש לאי־קומרס שמוכר — מציל חיפושים כושלים והופך כוונת קונים להכנסות.",
    images: ["/main-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "none",
    },
  },
  icons: {
    icon: [
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.className} min-h-screen flex flex-col bg-white`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        <Providers>
          <ConditionalMarketingScripts />
          <ConditionalShopifyAppBridge />
          <MarketingAttributionCapture />
          <ConditionalMarketingNav />

          <ConditionalMainPadding>
            <main className="relative z-10 flex-grow">{children}</main>
            <ConditionalFooter />
          </ConditionalMainPadding>

          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
