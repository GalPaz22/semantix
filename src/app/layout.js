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
    "חיפוש לאיקומרס",
    "חיפוש AI",
    "Search Saver",
    "הצלת חיפושים ללא תוצאות",
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "300x300" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
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
