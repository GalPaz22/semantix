import { blogArticles } from '../data';

export function generateMetadata({ params }) {
  const article = blogArticles.find((a) => a.slug === params.slug);

  if (!article) {
    return { title: 'הכתבה לא נמצאה | Semantix' };
  }

  return {
    title: `${article.title} | Semantix`,
    description: article.excerpt,
    alternates: {
      canonical: `https://www.semantix.co.il/blog/${article.slug}`,
    },
  };
}

export default function BlogArticleLayout({ children }) {
  return children;
}
