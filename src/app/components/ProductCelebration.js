// components/ProductCelebration.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

/* ---------------------------------------- */
/* timing (ms)                              */
const flyMs = 2000;    // duration of fly-out animation (matches CSS)
const holdMs = 3000;   // how long to show each product before flying out
/* ---------------------------------------- */

const directions = ["right", "left", "top-right", "top-left"];

export default function ProductCelebration({ product }) {
  const [products, setProducts] = useState(new Map());
  const timeoutRefs = useRef(new Map());
  const processedProducts = useRef(new Set());

  /* ───── effect – runs every time *new* product arrives ───── */
  useEffect(() => {
    if (!product?.image || !product?.id) return;

    // Skip if we've already processed this product
    if (processedProducts.current.has(product.id)) return;
    processedProducts.current.add(product.id);

    // Add new product to the map if it doesn't exist
    if (!products.has(product.id)) {
      setProducts(prev => {
        const next = new Map(prev);
        next.set(product.id, {
          ...product,
          visible: true,
          phase: "hold",
          direction: directions[Math.floor(Math.random() * directions.length)]
        });
        return next;
      });

      /* confetti blast for new products */
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#7C3AED', '#A855F7', '#C084FC', '#E9D5FF']
      });

      // Set up automatic removal after holdMs
      const timeout = setTimeout(() => {
        handleClose(product.id);
      }, holdMs);

      timeoutRefs.current.set(product.id, timeout);
    }

    // Cleanup timeouts
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, [product?.id]);

  const handleClose = (productId) => {
    // Clear the auto-close timeout if it exists
    if (timeoutRefs.current.has(productId)) {
      clearTimeout(timeoutRefs.current.get(productId));
      timeoutRefs.current.delete(productId);
    }

    setProducts(prev => {
      const next = new Map(prev);
      const product = next.get(productId);
      if (product) {
        next.set(productId, { ...product, phase: "fly" });
      }
      return next;
    });

    setTimeout(() => {
      setProducts(prev => {
        const next = new Map(prev);
        next.delete(productId);
        return next;
      });
      // Remove from processed products after animation completes
      processedProducts.current.delete(productId);
    }, flyMs);
  };

  if (products.size === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
      <div className="relative max-w-md w-full mx-auto px-4">
        {/* Products grid */}
        <div className="grid grid-cols-1 gap-6">
          {Array.from(products.entries()).map(([id, product]) => (
            <div
              key={id}
              className={`relative flex flex-col items-center transition-transform
                         ${product.phase === "hold" ? "animate-bounce-gentle" : ""}
                         ${product.phase === "fly" ? `fly-${product.direction}` : ""}`}
            >
              {/* Close button */}
              <button
                onClick={() => handleClose(id)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full shadow-lg
                          flex items-center justify-center hover:bg-gray-100 transition-colors
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                          pointer-events-auto z-10"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl w-full pointer-events-auto border border-purple-100">
                <p className="text-gray-800 text-xl font-bold mb-4 text-center">
                  New Product Added!
                </p>

                <div className="relative w-48 h-48 mx-auto mb-4">
                  <img
                    src={product.image}
                    alt={product.name ?? "new product"}
                    className="w-full h-full object-contain rounded-lg shadow-md"
                  />
                </div>

                {product.name && (
                  <p className="mt-4 text-gray-700 text-center font-medium text-lg">
                    {product.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* inline CSS for the fly-out directions and gentle bounce */}
      <style jsx>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        @keyframes fly-right {
          to { transform: translate(380px,-120px) rotate(30deg) scale(0.4);
               opacity: 0; }
        }
        @keyframes fly-left {
          to { transform: translate(-380px,-80px) rotate(-30deg) scale(0.4);
               opacity: 0; }
        }
        @keyframes fly-top-right {
          to { transform: translate(280px,-280px) rotate(45deg) scale(0.5);
               opacity: 0; }
        }
        @keyframes fly-top-left {
          to { transform: translate(-280px,-280px) rotate(-45deg) scale(0.5);
               opacity: 0; }
        }

        .fly-right { animation: fly-right ${flyMs}ms ease-in forwards; }
        .fly-left { animation: fly-left ${flyMs}ms ease-in forwards; }
        .fly-top-right { animation: fly-top-right ${flyMs}ms ease-in forwards; }
        .fly-top-left { animation: fly-top-left ${flyMs}ms ease-in forwards; }
      `}</style>
    </div>
  );
}
