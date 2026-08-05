import Link from 'next/link';
import CaseStudyList from './CaseStudyList';

export default function CaseStudySection() {
  return (
    <section dir="rtl" className="border-t border-gray-200 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <CaseStudyList showHeader />
        <div className="mt-10">
          <Link
            href="/case-studies"
            className="text-sm font-semibold text-gray-900 underline-offset-4 hover:underline"
          >
            עיינו בכל הפרויקטים ←
          </Link>
        </div>
      </div>
    </section>
  );
}
