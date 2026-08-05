'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const ImageCarousel = () => {
  const [isClient, setIsClient] = useState(false);
  
  const brandLogos = [
    {
      src: '/garmin-logo.svg',
      url: 'https://www.garmin.co.il',
      name: 'Garmin Israel',
      size: 'garmin',
    },
    {
      src: '/lisa-leonard-logo.png',
      url: 'https://www.lisaleonard.com',
      name: 'Lisa Leonard',
      size: 'wide',
    },
    {
      src: '/wineroute_logo.png',
      url: 'https://www.wineroute.co.il',
      name: 'Wine Route',
      size: 'normal'
    },
    {
      src: '/mano_logo-removebg-preview.png',
      url: 'https://www.manovino.co.il',
      name: 'Manovino',
      size: 'large'
    },
    {
      src: '/dizzy_logo-removebg-preview.png',
      url: null,
      name: 'Dizzy Wine',
      size: 'steady'
    },
    {
      src: '/they_fream-removebg-preview.png',
      url: 'https://www.theydream-online.com',
      name: 'They Dream',
      size: 'normal'
    },
    {
      src: '/alcohome-logo.svg',
      url: null,
      name: 'Alcohome',
      size: 'steady'
    },
    {
      src: '/cheers_logo.png',
      url: 'https://www.cheers.co.il',
      name: 'Cheers',
      size: 'normal'
    }
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getLogoDimensions = (logo) => {
    if (logo.size === 'garmin') {
      return { height: 53, maxWidth: 226 };
    }
    if (logo.size === 'wide') {
      return { height: 44, maxWidth: 288 };
    }
    if (logo.size === 'large') {
      return { height: 96, maxWidth: 345 };
    }
    // Dizzy Wine / Alcohome — leave at prior "normal" size
    if (logo.size === 'steady') {
      return { height: 48, maxWidth: 160 };
    }
    return { height: 58, maxWidth: 192 };
  };

  return (
    <div className="flex w-full justify-end overflow-hidden bg-transparent py-6 sm:py-8">
      <div className="w-full sm:ml-auto sm:w-4/5" dir="ltr">
        {/* Scrolling track — LTR so the duplicated strip loops infinitely under RTL layout */}
        <div
          className={`flex h-20 flex-row flex-nowrap items-center gap-8 sm:h-[120px] sm:gap-16 ${
            isClient ? 'animate-scroll-track-1' : ''
          }`}
          style={isClient ? { animationIterationCount: 'infinite', animationTimingFunction: 'linear' } : undefined}
        >
          {brandLogos.concat(brandLogos).map((logo, logoIndex) => {
            const { height: logoHeight, maxWidth } = getLogoDimensions(logo);

            const logoContent =
              logo.src.endsWith('.svg') ? (
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="block h-10 w-auto max-w-[140px] object-contain object-center sm:h-[var(--logo-h)] sm:max-w-[var(--logo-mw)]"
                  style={{
                    '--logo-h': `${logoHeight}px`,
                    '--logo-mw': `${maxWidth}px`,
                  }}
                />
              ) : (
                <Image
                  src={logo.src}
                  alt={logo.name}
                  height={logoHeight}
                  width={Math.round(logoHeight * 3)}
                  className="h-10 w-auto max-w-[140px] object-contain object-center sm:h-auto sm:max-h-[var(--logo-h)] sm:max-w-[var(--logo-mw)]"
                  style={{
                    '--logo-h': `${logoHeight}px`,
                    '--logo-mw': `${maxWidth}px`,
                  }}
                  priority
                />
              );

            const shellClass =
              'flex h-16 min-w-[72px] flex-shrink-0 items-center justify-center px-1.5 sm:h-28 sm:min-w-[120px] sm:px-3';

            return logo.url ? (
              <a
                key={`logo-${logoIndex}`}
                href={logo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${shellClass} opacity-80 transition-opacity hover:opacity-100`}
              >
                {logoContent}
              </a>
            ) : (
              <div key={`logo-${logoIndex}`} className={`${shellClass} opacity-80`}>
                {logoContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel; 