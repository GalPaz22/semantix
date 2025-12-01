'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function AdminPanel({ session }) {
  const [apiKey, setApiKey] = useState('');
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [saveCredentialsStatus, setSaveCredentialsStatus] = useState('idle');
  
  // User data fetched from API key
  const [userData, setUserData] = useState(null);
  const [dbName, setDbName] = useState('');
  const [categories, setCategories] = useState('');
  const [productTypes, setProductTypes] = useState('');
  const [softCategories, setSoftCategories] = useState('');
  
  // Reprocessing options
  const [reprocessOptions, setReprocessOptions] = useState({
    reprocessHardCategories: true,
    reprocessSoftCategories: true,
    reprocessTypes: true,
    reprocessVariants: true,
    reprocessEmbeddings: true,
    reprocessDescriptions: true,
    translateBeforeEmbedding: true
  });

  const userEmail = session?.user?.email;
  const isAdmin = userEmail === 'galpaz2210@gmail.com';

  const handleFetchUserData = async () => {
    if (!isAdmin || !apiKey) return;
    setFetchStatus('loading');
    try {
      const response = await fetch(`/api/admin/lookup-by-apikey?apiKey=${encodeURIComponent(apiKey)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user data:', data);
        setUserData(data);
        
        // Extract from nested configuration structure
        const config = data.configuration || {};
        setDbName(config.dbName || '');
        setCategories(Array.isArray(config.categories?.list) ? config.categories.list.join(', ') : '');
        setProductTypes(Array.isArray(config.types?.list) ? config.types.list.join(', ') : '');
        setSoftCategories(Array.isArray(config.softCategories?.list) ? config.softCategories.list.join(', ') : '');
        setFetchStatus('success');
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch user data:', errorData);
        setFetchStatus('error');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setFetchStatus('error');
    } finally {
      setTimeout(() => setFetchStatus('idle'), 3000);
    }
  };

  const handleSaveCredentials = async () => {
    if (!isAdmin || !userData) return;
    setSaveCredentialsStatus('loading');
    try {
      const response = await fetch('/api/admin/update-user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          types: productTypes.split(',').map(t => t.trim()).filter(Boolean),
          softCategories: softCategories.split(',').map(s => s.trim()).filter(Boolean)
        }),
      });
      if (response.ok) {
        setSaveCredentialsStatus('success');
      } else {
        setSaveCredentialsStatus('error');
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
      setSaveCredentialsStatus('error');
    } finally {
      setTimeout(() => setSaveCredentialsStatus('idle'), 3000);
    }
  };

  const handleProcessProducts = async () => {
    if (!isAdmin || !userData || !dbName) return;
    setProcessingStatus('loading');
    try {
      const response = await fetch('/api/reprocess-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dbName,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          type: productTypes.split(',').map(t => t.trim()).filter(Boolean),
          softCategories: softCategories.split(',').map(s => s.trim()).filter(Boolean),
          ...reprocessOptions
        }),
      });
      if (response.ok) {
        setProcessingStatus('success');
      } else {
        const errorData = await response.json();
        console.error('Failed to process products:', errorData);
        setProcessingStatus('error');
      }
    } catch (error) {
      console.error('Failed to process products:', error);
      setProcessingStatus('error');
    } finally {
      setTimeout(() => setProcessingStatus('idle'), 3000);
    }
  };

  const toggleOption = (option) => {
    setReprocessOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const toggleAll = () => {
    const allEnabled = Object.values(reprocessOptions).every(v => v);
    const newState = !allEnabled;
    setReprocessOptions({
      reprocessHardCategories: newState,
      reprocessSoftCategories: newState,
      reprocessTypes: newState,
      reprocessVariants: newState,
      reprocessEmbeddings: newState,
      reprocessDescriptions: newState,
      translateBeforeEmbedding: newState
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-gray-600">You do not have permission to view this panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* API Key Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">API Key Lookup</h2>
          <p className="text-sm text-gray-500 mt-1">Enter an API key to fetch and manage user credentials.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <button 
              onClick={handleFetchUserData} 
              disabled={fetchStatus === 'loading' || !apiKey}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {fetchStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Fetch</span>
            </button>
          </div>
          {fetchStatus === 'success' && (
            <p className="text-green-600 text-sm">✓ User data loaded successfully</p>
          )}
          {fetchStatus === 'error' && (
            <p className="text-red-600 text-sm">✗ Failed to fetch user data</p>
          )}
        </div>
      </div>

      {/* User Credentials Editor */}
      {userData && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800">User Credentials</h2>
            <div className="text-sm text-gray-500 mt-1 space-y-1">
              <p><span className="font-medium">Email:</span> {userData.user?.email}</p>
              <p><span className="font-medium">Database:</span> {dbName}</p>
              <p><span className="font-medium">Platform:</span> {userData.configuration?.platform}</p>
              <p><span className="font-medium">Products:</span> {userData.configuration?.productCount || 0}</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories (comma-separated)
              </label>
              <input
                type="text"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="e.g., יין אדום, יין לבן"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Types (comma-separated)
              </label>
              <input
                type="text"
                value={productTypes}
                onChange={(e) => setProductTypes(e.target.value)}
                placeholder="e.g., כשר, מבצע"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soft Categories (comma-separated)
              </label>
              <input
                type="text"
                value={softCategories}
                onChange={(e) => setSoftCategories(e.target.value)}
                placeholder="e.g., מתנות, אירועים"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={handleSaveCredentials} 
              disabled={saveCredentialsStatus === 'loading'}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {saveCredentialsStatus === 'loading' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saveCredentialsStatus === 'success' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : saveCredentialsStatus === 'error' ? (
                <XCircle className="mr-2 h-4 w-4" />
              ) : null}
              Save Credentials
            </button>
            {saveCredentialsStatus === 'success' && (
              <p className="text-green-600 text-sm">✓ Credentials saved successfully</p>
            )}
            {saveCredentialsStatus === 'error' && (
              <p className="text-red-600 text-sm">✗ Failed to save credentials</p>
            )}
          </div>
        </div>
      )}

      {/* Reprocessing Options */}
      {userData && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800">Reprocessing Options</h2>
            <p className="text-sm text-gray-500 mt-1">Select which components to reprocess.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Select All / Deselect All</span>
              <button
                onClick={toggleAll}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Toggle All
              </button>
            </div>
            
            {[
              { key: 'reprocessHardCategories', label: 'Hard Categories', description: 'Reprocess main product categories' },
              { key: 'reprocessSoftCategories', label: 'Soft Categories', description: 'Reprocess flexible categorization' },
              { key: 'reprocessTypes', label: 'Product Types', description: 'Reprocess product type classifications' },
              { key: 'reprocessVariants', label: 'Variants', description: 'Reprocess product variants (sizes, colors)' },
              { key: 'reprocessEmbeddings', label: 'Embeddings', description: 'Regenerate vector embeddings' },
              { key: 'reprocessDescriptions', label: 'Descriptions', description: 'Retranslate and enrich descriptions' },
              { key: 'translateBeforeEmbedding', label: 'Translation', description: 'Translate to English before embedding' }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-start space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  id={key}
                  checked={reprocessOptions[key]}
                  onChange={() => toggleOption(key)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={key} className="text-sm font-medium text-gray-700 cursor-pointer">
                    {label}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
              </div>
            ))}

            <button 
              onClick={handleProcessProducts} 
              disabled={processingStatus === 'loading' || !userData || !dbName}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
            >
              {processingStatus === 'loading' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : processingStatus === 'success' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : processingStatus === 'error' ? (
                <XCircle className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Start Reprocessing
            </button>
            {processingStatus === 'success' && (
              <p className="text-green-600 text-sm text-center">✓ Product reprocessing initiated successfully!</p>
            )}
            {processingStatus === 'error' && (
              <p className="text-red-600 text-sm text-center">✗ Error initiating product reprocessing</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
