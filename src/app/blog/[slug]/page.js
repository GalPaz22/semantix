"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { blogArticles } from "../data";
import { PRIMARY_CTA } from "../../lib/marketing-copy";

export default function BlogArticlePage() {
  const params = useParams();
  const article = blogArticles.find((a) => a.slug === params?.slug);

  if (!article) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">המאמר לא נמצא</h1>
          <Link
            href="/blog"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            חזרה לבלוג
          </Link>
        </div>
      </div>
    );
  }

  // Convert markdown-style content to HTML sections
  const contentSections = article.content.split(/\n\n/).filter((section) => section.trim());

  // Extract FAQ questions from content (looking for common FAQ patterns)
  const faqQuestions = contentSections
    .filter((section) => section.match(/^(What|How|Why|When|Where|Can|Does|Is|Are)/i))
    .slice(0, 5)
    .map((q) => ({
      "@type": "Question",
      "name": q.split("\n")[0].replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim(),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.split("\n").slice(1).join(" ").substring(0, 500) || q.substring(0, 500)
      }
    }));

  // Structured data for Article
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": article.excerpt,
    "image": `https://www.semantix.co.il${article.image}`,
    "datePublished": article.date,
    "dateModified": article.date,
    "author": {
      "@type": "Organization",
      "name": article.author,
      "url": "https://www.semantix.co.il"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Semantix",
      "url": "https://www.semantix.co.il",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.semantix.co.il/main-logo.svg"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.semantix.co.il/blog/${article.slug}`
    },
    "articleSection": article.category,
    "keywords": `semantic search, AI search, e-commerce search, natural language processing, ${article.category.toLowerCase()}, search optimization, customer experience`,
    "inLanguage": "he-IL",
    "wordCount": article.content.split(/\s+/).length
  };

  // FAQ structured data if questions exist
  const faqStructuredData = faqQuestions.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqQuestions
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      {faqStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-purple-500 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center text-purple-100 hover:text-white mb-6 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              חזרה לבלוג
            </Link>
            <div className="flex items-center text-sm text-purple-100 mb-4">
              <time dateTime={article.date}>{article.date}</time>
              <span className="mx-2">•</span>
              <span>{article.readTime}</span>
              <span className="mx-2">•</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">{article.category}</span>
            </div>
            <h1 itemProp="headline" className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>
            <p itemProp="description" className="text-xl text-purple-100">{article.excerpt}</p>
          </div>
        </header>

        {/* Article Content */}
        <article itemScope itemType="https://schema.org/BlogPosting" className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            {contentSections.map((section, index) => {
              // Handle headers
              if (section.startsWith("# ")) {
                return (
                  <h1
                    key={index}
                    className="text-3xl font-bold text-gray-900 mt-8 mb-4 first:mt-0"
                  >
                    {section.replace("# ", "")}
                  </h1>
                );
              }
              if (section.startsWith("## ")) {
                return (
                  <h2
                    key={index}
                    className="text-2xl font-bold text-gray-900 mt-8 mb-4"
                  >
                    {section.replace("## ", "")}
                  </h2>
                );
              }
              if (section.startsWith("### ")) {
                return (
                  <h3
                    key={index}
                    className="text-xl font-semibold text-gray-800 mt-6 mb-3"
                  >
                    {section.replace("### ", "")}
                  </h3>
                );
              }
              // Handle lists
              if (section.includes("- **") || section.includes("- [ ]")) {
                const items = section.split(/\n- /).filter((item) => item.trim());
                return (
                  <ul key={index} className="list-disc list-inside space-y-2 my-4 text-gray-700">
                    {items.map((item, itemIndex) => (
                      <li key={itemIndex} className="ml-4">
                        {item.replace(/^\*\*|\*\*$|\[ \]|\[x\]/g, "").trim()}
                      </li>
                    ))}
                  </ul>
                );
              }
              // Regular paragraphs
              return (
                <p
                  key={index}
                  className="text-gray-700 leading-relaxed mb-4 text-lg"
                >
                  {section}
                </p>
              );
            })}
          </div>

          {/* Author Info */}
          <div className="mt-12 pt-8 border-t border-gray-200" itemScope itemType="https://schema.org/Organization">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                <span className="text-purple-600 font-bold text-lg">S</span>
              </div>
              <div>
                <p itemProp="name" className="font-semibold text-gray-900">{article.author}</p>
                <p className="text-sm text-gray-600">צוות Semantix</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <aside className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">מאמרים קשורים</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {blogArticles
              .filter((a) => a.id !== article.id && a.category === article.category)
              .slice(0, 2)
              .map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  href={`/blog/${relatedArticle.slug}`}
                  className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-100 hover:border-purple-200"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    {relatedArticle.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {relatedArticle.excerpt}
                  </p>
                  <div className="flex items-center text-purple-600 text-sm font-medium">
                    לקרוא את המאמר
                    <svg
                      className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
          </div>
        </aside>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">רוצים ללמוד עוד?</h2>
          <p className="text-purple-100 mb-6">
            לראות חיפוש סמנטי בפעולה עם הדגמה מותאמת אישית
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-purple-600 font-bold py-3 px-8 rounded-full hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </article>

    </div>
    </>
  );
}
