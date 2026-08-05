import Link from 'next/link';
import { CASE_STUDIES } from '../lib/case-studies';

function MerchantMark({ study, align = 'left' }) {
  // Keep left alignment on mobile; only mirror on large screens.
  const alignClass =
    align === 'right'
      ? 'items-start text-left lg:items-end lg:text-right'
      : 'items-start text-left';
  const largeLogo = study.slug === 'lisa-leonard';
  const imgClass = [
    largeLogo
      ? 'h-16 max-w-full sm:h-20 sm:max-w-[280px] lg:h-24 lg:max-w-[340px]'
      : 'h-10 max-w-[180px] sm:h-14 sm:max-w-[220px]',
    'w-auto object-contain',
    align === 'right' ? 'object-left lg:object-right' : 'object-left',
  ].join(' ');

  if (study.logo) {
    return (
      <div className={`flex flex-col ${alignClass}`}>
        <img src={study.logo} alt={study.name} className={imgClass} />
        <p className="mt-3 text-sm font-medium text-gray-500">{study.name}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          {study.product}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${alignClass}`}>
      <span className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 sm:text-3xl">
        {study.name}
      </span>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        {study.product}
      </p>
    </div>
  );
}

function Highlights({ study, align = 'left' }) {
  return (
    <div
      className={`flex flex-wrap gap-x-8 gap-y-5 sm:gap-x-10 ${
        align === 'right'
          ? 'justify-start text-left lg:justify-end lg:text-right'
          : 'justify-start text-left'
      }`}
    >
      {(study.highlights || []).map((item) => (
        <div key={`${study.slug}-${item.label}`} className="min-w-0 max-w-full basis-[calc(50%-1rem)] sm:min-w-[5rem] sm:basis-auto">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-gray-900 sm:text-5xl">
            {item.value}
          </p>
          <p className="mt-2 text-xs font-medium leading-4 text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function StoryBlock({ study, align = 'left' }) {
  return (
    <div
      className={`space-y-6 text-left ${
        align === 'right' ? 'lg:text-right' : ''
      }`}
    >
      <MerchantMark study={study} align={align} />
      <p
        className={`max-w-md text-base leading-7 text-gray-600 sm:text-[1.05rem] sm:leading-8 ${
          align === 'right' ? 'lg:ml-auto' : ''
        }`}
      >
        {study.blurb}
      </p>
      <span className="inline-flex text-sm font-semibold text-gray-900 underline-offset-4 group-hover:underline">
        צפו בפרויקט ←
      </span>
    </div>
  );
}

export default function CaseStudyList({
  studies = CASE_STUDIES,
  showHeader = false,
}) {
  return (
    <div dir="rtl">
      {showHeader ? (
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            לקוחות
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">
            מספרים מחנויות שכבר רצות על Semantix.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            פרויקט לכל חנות — ייחוס להכנסות, מה הוחזר מחיפושים ריקים,
            ואם זה Search Saver או Semantix Search.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-8 sm:gap-10">
        {studies.map((study, index) => {
          const storyOnLeft = index % 2 === 0;

          return (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="group block rounded-[28px] border border-gray-900 bg-white px-4 py-10 transition hover:bg-gray-50/90 sm:rounded-[36px] sm:px-8 sm:py-24"
            >
              <div
                className={`flex flex-col gap-8 lg:items-center lg:gap-20 ${
                  storyOnLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <StoryBlock study={study} align={storyOnLeft ? 'left' : 'right'} />
                </div>
                <div className="min-w-0 flex-1">
                  <Highlights study={study} align={storyOnLeft ? 'right' : 'left'} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
