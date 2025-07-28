import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { INSTALL_URL } from "/lib/shopify-app-config";

export default function ShopifyInstallButton({ className }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleInstall = async () => {
    setIsLoading(true);
    
    try {
      // Redirect to our custom install page for the public app
      router.push(INSTALL_URL);
    } catch (error) {
      console.error("Installation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleInstall}
        disabled={isLoading}
        className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center ${className || ''}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Installing...
          </>
        ) : (
          <>➊ Install on Shopify</>
        )}
      </button>
    </div>
  );
}