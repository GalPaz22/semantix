'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const ImageCarousel = () => {
  const [isClient, setIsClient] = useState(false);
  
  const brandLogos = [
    {
      src: '/dizzy_logo-removebg-preview.png',
      url: 'https://www.dizzywine.co.il',
      name: 'Dizzy Wine',
      size: 'normal'
    },
    {
      src: '/mano_logo-removebg-preview.png',
      url: 'https://www.manovino.co.il',
      name: 'Manovino',
      size: 'large'
    },
    {
      src: '/they_fream-removebg-preview.png',
      url: 'https://www.theydream-online.com',
      name: 'They Dream',
      size: 'normal'
    },
    {
      src: '/alcohome-logo.svg',
      url: 'https://www.alcohome.co.il',
      name: 'Alcohome',
      size: 'normal'
    },
    {
      src: '/wineRoute.png',
      url: 'https://www.wineroute.co.il',
      name: 'WineRoute',
      size: 'normal'
    },
    {
      src: '/cheers.png',
      url: 'https://www.cheers.co.il',
      name: 'Cheers',
      size: 'normal'
    }
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const renderLogo = (logo, index, setNumber) => (
    <a
      key={`logo-${setNumber}-${index}`}
      href={logo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {logo.src.endsWith('.svg') ? (
        <img
          src={logo.src}
          alt={logo.name}
          style={{
            height: logo.size === 'large' ? '96px' : '64px',
            width: 'auto',
            display: 'block',
            maxWidth: logo.size === 'large' ? '240px' : '160px',
            objectFit: 'contain',
            verticalAlign: 'middle',
            marginTop: '-10px'
          }}
        />
      ) : (
        <Image
          src={logo.src}
          alt={logo.name}
          height={logo.size === 'large' ? 96 : 64}
          width={logo.size === 'large' ? 192 : 144}
          className="object-contain align-middle"
          style={{ maxHeight: logo.size === 'large' ? '96px' : '64px', width: 'auto', verticalAlign: 'middle' }}
          priority
        />
      )}
    </a>
  );

  return (
    <div className="w-full overflow-hidden bg-transparent py-8">
      <div className="w-full md:ml-auto md:w-4/5">
        <div className="relative" style={{ height: '100px' }}>
          <div className={`absolute flex items-center gap-8 md:gap-16 ${isClient ? 'animate-infinite-scroll' : ''}`} style={{ left: '0' }}>
            {/* Multiple sets for seamless infinite scroll */}
            {brandLogos.map((logo, index) => renderLogo(logo, index, 1))}
            {brandLogos.map((logo, index) => renderLogo(logo, index, 2))}
            {brandLogos.map((logo, index) => renderLogo(logo, index, 3))}
            {brandLogos.map((logo, index) => renderLogo(logo, index, 4))}
            {brandLogos.map((logo, index) => renderLogo(logo, index, 5))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel; 