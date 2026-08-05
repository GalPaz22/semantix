'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function MobileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [whatWeDoOpen, setWhatWeDoOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const menuItems = [
    {
      title: 'Search Saver',
      link: '/search-saver',
    },
    {
      title: 'Semantix Search',
      link: '/search-discovery',
    },
  ];

  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="md:hidden relative z-[60] flex h-8 w-8 cursor-pointer touch-manipulation items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
        aria-label="פתח תפריט"
        type="button"
        aria-expanded={isOpen}
        style={{ WebkitTapHighlightColor: 'transparent', pointerEvents: 'auto' }}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[100] md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={menuRef}
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto z-[110] md:hidden"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <img src="/main-logo.svg" alt="Semantix Logo" className="h-8 w-auto" />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="סגור תפריט"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="space-y-4">
                  <div>
                    <button
                      onClick={() => setWhatWeDoOpen(!whatWeDoOpen)}
                      className="w-full flex items-center justify-between text-lg font-medium text-gray-900 py-3 hover:text-purple-600 transition-colors"
                    >
                      מוצרים
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${whatWeDoOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {whatWeDoOpen && (
                      <div className="pr-4 space-y-2 mt-2">
                        {menuItems.map((item) => (
                          <Link
                            key={item.link}
                            href={item.link}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsOpen(false);
                              setWhatWeDoOpen(false);
                              router.push(item.link);
                            }}
                            className="block py-2 text-gray-600 hover:text-purple-600 transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/case-studies"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/case-studies');
                    }}
                    className="block text-lg font-medium text-gray-900 py-3 hover:text-purple-600 transition-colors"
                  >
                    פרויקטים
                  </Link>

                  <Link
                    href="/learn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/learn');
                    }}
                    className="block text-lg font-medium text-gray-900 py-3 hover:text-purple-600 transition-colors"
                  >
                    למידה
                  </Link>

                  <Link
                    href="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/about');
                    }}
                    className="block text-lg font-medium text-gray-900 py-3 hover:text-purple-600 transition-colors"
                  >
                    אודות
                  </Link>

                  <Link
                    href="/contact"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/contact');
                    }}
                    className="block w-full text-center py-3 px-6 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium mt-6 hover:from-purple-700 hover:to-purple-600 transition-colors"
                  >
                    קבעו פגישה
                  </Link>
                </nav>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
