"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Loading component for Suspense
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-blue-200 animate-spin mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  );
}

// Main component wrapped with error boundaries
function ShopifyInstallContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [shopDomain, setShopDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/install-shopify-app');
    }
  }, [status, router]);

  const handleInstall = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!shopDomain) {
      setError('Please enter your Shopify store domain');
      setIsLoading(false);
      return;
    }

    try {
      // Generate installation URL
      const response = await fetch('/api/shopify-install-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shopDomain })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate installation URL');
      }

      // Redirect to Shopify OAuth page
      window.location.href = data.url;
    } catch (error) {
      console.error('Installation error:', error);
      setError(error.message || 'An error occurred during installation');
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <LoadingState />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Install Semantix on Shopify</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Connect Your Shopify Store</h2>
        
        <form onSubmit={handleInstall}>
          <div className="mb-4">
            <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-1">
              Shopify Store Domain
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="shopDomain"
                name="shopDomain"
                placeholder="your-store"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                .myshopify.com
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter your Shopify store name without the .myshopify.com part
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading ? 'Connecting...' : 'Connect Store'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">What happens next?</h3>
        <p className="text-blue-700 text-sm">
          You'll be redirected to Shopify to authorize Semantix. After authorization,
          we'll set up the necessary components in your store.
        </p>
      </div>
    </div>
  );
}

export default function ShopifyInstallPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ShopifyInstallContent />
    </Suspense>
  );
} 