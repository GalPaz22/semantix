'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Package, AlertCircle } from 'lucide-react';

export default function DemoPanel({ session, onboarding }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [tier1Products, setTier1Products] = useState([]);
  const [tier2Products, setTier2Products] = useState([]);
  const [isLoadingPhase2, setIsLoadingPhase2] = useState(false);
  const [error, setError] = useState('');
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const userEmail = session?.user?.email;
  
  // Get API key from onboarding data
  const apiKey = onboarding?.apiKey || '';

  useEffect(() => {
    if (!apiKey) {
      console.warn('No API key available');
    }
  }, [apiKey]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete
  const handleQueryChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (value.length > 1 && apiKey) {
      debounceTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query) => {
    try {
      const response = await fetch(`https://api.semantix-ai.com/autocomplete?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  // Handle search
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim() || !apiKey) return;

    setIsSearching(true);
    setError('');
    setShowSuggestions(false);
    setTier1Products([]);
    setTier2Products([]);
    setSearchResults(null);

    try {
      // Phase 1: Text matches
      const phase1Response = await fetch('https://api.semantix-ai.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          query: query,
          explain: true,
          modern: true,
          phase: 'text-matches-only'
        })
      });

      if (!phase1Response.ok) {
        throw new Error('חיפוש נכשל');
      }

      const phase1Data = await phase1Response.json();
      setSearchResults(phase1Data);
      setTier1Products(phase1Data.products || []);
      setIsSearching(false);

      // Phase 2: Category matches (if applicable)
      if (phase1Data.pagination?.hasCategoryFiltering && phase1Data.metadata?.extractedCategories) {
        handlePhase2(query, phase1Data);
      }

    } catch (err) {
      setError(err.message || 'שגיאה בחיפוש');
      setIsSearching(false);
    }
  };

  // Handle Phase 2 (category-filtered)
  const handlePhase2 = async (query, phase1Data) => {
    setIsLoadingPhase2(true);

    try {
      const shownIds = phase1Data.products?.map(p => p._id || p.id) || [];
      
      const phase2Response = await fetch('https://api.semantix-ai.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          query: query,
          modern: true,
          phase: 'category-filtered',
          extractedCategories: phase1Data.metadata.extractedCategories,
          excludeIds: shownIds
        })
      });

      if (phase2Response.ok) {
        const phase2Data = await phase2Response.json();
        setTier2Products(phase2Data.products || []);
      }
    } catch (err) {
      console.error('Phase 2 error:', err);
    } finally {
      setIsLoadingPhase2(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.url) {
      window.open(suggestion.url, '_blank');
    } else {
      setSearchQuery(suggestion.suggestion);
      handleSearch(suggestion.suggestion);
    }
    setShowSuggestions(false);
  };

  // Product Card Component
  const ProductCard = ({ product, isTier1 }) => {
    const price = product.price ? `₪${parseFloat(product.price).toFixed(2)}` : '';
    
    return (
      <div
        className="bg-white border border-gray-200 rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col h-full"
        onClick={() => product.url && window.open(product.url, '_blank')}
      >
        {/* Badge */}
        <div className="absolute top-2 right-2 z-10">
          {isTier1 ? (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold uppercase rounded-sm">
              התאמה
            </span>
          ) : product.softCategoryExpansion ? (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold uppercase rounded-sm">
              קשור
            </span>
          ) : null}
        </div>

        {/* Image */}
        <div className="relative w-full h-72 p-5 bg-white flex items-center justify-center">
          <img
            src={product.image || 'https://via.placeholder.com/300x400?text=No+Image'}
            alt={product.name}
            className="max-w-full max-h-full object-contain transition-transform duration-400 hover:scale-110"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="p-5 flex-1 flex flex-col justify-between text-center">
          <h3 className="font-rubik text-base leading-relaxed text-gray-800 mb-2 min-h-[45px] line-clamp-2">
            {product.name}
          </h3>
          
          {price && (
            <div className="font-playfair text-2xl font-bold text-gray-800 mb-4 tracking-wide">
              {price}
            </div>
          )}

          {/* AI Explanation - shows on hover */}
          {product.explanation && (
            <div className="text-xs bg-gray-50 text-gray-600 p-2 mb-2 border-t border-gray-200 text-right opacity-0 hover:opacity-100 transition-opacity">
              💡 {product.explanation}
            </div>
          )}

          {/* View Button */}
          <button className="w-full py-3 bg-[#998470] text-white font-medium text-base transition-colors hover:bg-[#7d6a58] rounded-none">
            לצפייה
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Search Header */}
      <div className="sticky top-0 bg-white shadow-sm z-50 py-4 px-5">
        <div className="max-w-2xl mx-auto relative">
          <div className="relative flex items-center">
            <button
              onClick={() => handleSearch()}
              className="absolute right-4 text-gray-500 hover:text-[#998470] transition-colors"
              disabled={isSearching || !apiKey}
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleQueryChange}
              onKeyPress={handleKeyPress}
              placeholder="חיפוש מוצרים..."
              disabled={!apiKey}
              className="w-full pr-12 pl-5 py-3 bg-gray-50 border border-gray-300 rounded-full text-base font-rubik transition-all focus:bg-white focus:border-[#998470] focus:outline-none focus:ring-3 focus:ring-[#998470]/10"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
            >
              {suggestions.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSuggestionClick(item)}
                  className="flex items-center justify-between p-3 cursor-pointer border-b border-gray-50 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-gray-800">{item.suggestion}</span>
                    {item.price && (
                      <span className="font-bold text-[#998470] mr-2">
                        ₪{parseFloat(item.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.suggestion}
                      className="w-10 h-10 object-contain mr-3"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-5 py-5">
        
        {/* No API Key Warning */}
        {!apiKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">טוען מפתח API...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results Meta */}
        <div className="mb-5 pb-3 border-b border-gray-200">
          <div className="text-lg text-gray-600">
            {!searchResults && !isSearching && 'הזן מילת חיפוש להתחלה'}
            {isSearching && `מחפש "${searchQuery}"...`}
            {searchResults && !isSearching && (
              `נמצאו ${tier1Products.length + tier2Products.length} תוצאות`
            )}
          </div>
        </div>

        {/* Tier 1: Text Matches */}
        {tier1Products.length > 0 && (
          <section className="mb-12 animate-fadeInUp">
            <div className="flex items-center justify-between mb-5 pr-4 border-r-4 border-[#998470]">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">התאמה מדויקת</h2>
                <span className="text-sm text-gray-500">{tier1Products.length} תוצאות</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tier1Products.map((product, idx) => (
                <ProductCard key={product._id || idx} product={product} isTier1={true} />
              ))}
            </div>
          </section>
        )}

        {/* Progressive Loader */}
        {isLoadingPhase2 && (
          <div className="bg-white border border-gray-200 rounded p-5 mb-5 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#998470]" />
            <span className="text-gray-600">מחפשים מוצרים נוספים בקטגוריות רלוונטיות...</span>
          </div>
        )}

        {/* Tier 2: Category Matches */}
        {tier2Products.length > 0 && (
          <section className="mb-12 animate-fadeInUp">
            <div className="flex items-center justify-between mb-5 pr-4 border-r-4 border-blue-500">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">מוצרים קשורים (קטגוריות)</h2>
                <span className="text-sm text-gray-500">{tier2Products.length} תוצאות</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tier2Products.map((product, idx) => (
                <ProductCard key={product._id || idx} product={product} isTier1={false} />
              ))}
            </div>
          </section>
        )}

        {/* No Results */}
        {searchResults && tier1Products.length === 0 && tier2Products.length === 0 && !isLoadingPhase2 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl text-gray-500">לא נמצאו מוצרים</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

