"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { blogArticles } from "./data";
import { PRIMARY_CTA } from "../lib/marketing-copy";

export default function BlogPage() {
  // Structured data for Blog listing
  const blogStructuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Semantix Blog",
    "description": "תובנות, טיפים ושיטות עבודה מומלצות לחיפוש במסחר אלקטרוני, טכנולוגיית AI, חיפוש סמנטי ואופטימיזציה של חוויית לקוח",
    "url": "https://www.semantix.co.il/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Semantix",
      "url": "https://www.semantix.co.il"
    },
    "blogPost": blogArticles.map((article) => ({
      "@type": "BlogPosting",
      "headline": article.title,
      "description": article.excerpt,
      "url": `https://www.semantix.co.il/blog/${article.slug}`,
      "datePublished": article.date,
      "author": {
        "@type": "Organization",
        "name": article.author
      },
      "articleSection": article.category
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
      />
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
        {/* Header */}
        <header className="relative bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 text-white pt-20 pb-28 px-4 overflow-visible">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <div className="max-w-6xl mx-auto text-center relative z-10 pb-4">
            <div className="inline-block mb-4">
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                Semantix Blog
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent" style={{ lineHeight: '1.2', paddingBottom: '0.5rem' }}>
              תובנות ומומחיות
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
              לגלות איך חיפוש מונע AI משנה את המסחר האלקטרוני, מעלה המרות והופך גולשים לקונים
            </p>
          </div>
        </header>

        {/* Blog Articles Grid */}
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogArticles.map((article, index) => (
              <article
                key={article.id}
                itemScope
                itemType="https://schema.org/BlogPosting"
                className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-purple-300 transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Link href={`/blog/${article.slug}`} className="block h-full">
                  {/* Article Image */}
                  <div className="relative h-52 bg-gradient-to-br from-purple-500 via-purple-400 to-purple-600 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-white/95 backdrop-blur-sm text-purple-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                        {article.category}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                      <div className="flex items-center text-white/90 text-xs space-x-3">
                        <time dateTime={article.date} className="font-medium">{article.date}</time>
                        <span className="w-1 h-1 bg-white/60 rounded-full"></span>
                        <span className="font-medium">{article.readTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="p-6 pt-5">
                    <h2 
                      itemProp="headline" 
                      className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors duration-300 line-clamp-2 leading-tight"
                    >
                      {article.title}
                    </h2>
                    <p 
                      itemProp="description" 
                      className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-5"
                    >
                      {article.excerpt}
                    </p>
                    <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:text-purple-700 transition-colors">
                      <span>לקרוא את המאמר</span>
                      <svg
                        className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </main>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white py-16 px-4 mt-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">מוכנים לשנות את החיפוש שלכם?</h2>
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-2xl mx-auto">
            לראות איך חיפוש Semantix מונע AI מעלה שיעורי המרה והופך גולשים לקונים — עם תוצאות תוך ימים, לא חודשים
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 bg-white text-purple-600 font-bold py-4 px-10 rounded-full hover:bg-purple-50 transition-all duration-300 shadow-2xl hover:shadow-white/20 transform hover:scale-105 text-lg"
          >
            <span>{PRIMARY_CTA}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

    </div>
    </>
  );
}
