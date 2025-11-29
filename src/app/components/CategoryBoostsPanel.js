'use client'
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react';

export default function CategoryBoostsPanel({ session }) {
  const [softCategories, setSoftCategories] = useState([]);
  const [boosts, setBoosts] = useState({});
  const [originalBoosts, setOriginalBoosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current boosts
  const fetchBoosts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/category-boosts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSoftCategories(data.softCategories || []);

      // Ensure all categories have a boost value (default 1.0)
      const boostData = data.boosts || {};
      const completeBoosts = {};
      (data.softCategories || []).forEach(category => {
        completeBoosts[category] = boostData[category] !== undefined ? boostData[category] : 1.0;
      });

      setBoosts(completeBoosts);
      setOriginalBoosts(JSON.parse(JSON.stringify(completeBoosts)));
      setHasChanges(false);
    } catch (err) {
      console.error('Error fetching category boosts:', err);
      setError('Failed to load category boosts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoosts();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(boosts) !== JSON.stringify(originalBoosts);
    setHasChanges(changed);
  }, [boosts, originalBoosts]);

  // Handle boost value change
  const handleBoostChange = (category, value) => {
    setBoosts(prev => ({
      ...prev,
      [category]: parseFloat(value)
    }));
  };

  // Save boosts
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/category-boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boosts })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setOriginalBoosts(JSON.parse(JSON.stringify(boosts)));
      setHasChanges(false);
      setSuccess('Category boosts saved successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving category boosts:', err);
      setError(err.message || 'Failed to save category boosts. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original values
  const handleReset = () => {
    setBoosts(JSON.parse(JSON.stringify(originalBoosts)));
    setHasChanges(false);
  };

  // Reset all to default (1.0)
  const handleResetAll = () => {
    const defaultBoosts = {};
    softCategories.forEach(category => {
      defaultBoosts[category] = 1.0;
    });
    setBoosts(defaultBoosts);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (softCategories.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Soft Categories</h3>
            <p className="text-gray-500">
              You don't have any soft categories configured yet. Set up your categories in the onboarding settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-xl">
          <div className="relative p-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Category Boost Manager</h1>
              <p className="text-purple-100">
                Adjust boost values for soft categories to prioritize them in search results
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchBoosts}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-white/70 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/90">
                <p className="font-medium mb-1">How Category Boosts Work</p>
                <p className="text-white/70">
                  Boost values range from 0.1 to 10.0. Higher values make categories appear more prominently in search results.
                  Default is 1.0 (normal priority). Set to 2.0 for double priority, 0.5 for half priority, etc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <span className="text-amber-800">You have unsaved changes</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Boosts Panel */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-6 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Soft Categories ({softCategories.length})
          </h2>
          <button
            onClick={handleResetAll}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset All to Default (1.0)
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {softCategories.map((category) => {
              const boostValue = boosts[category] || 1.0;
              const isHigh = boostValue > 1.5;
              const isLow = boostValue < 0.8;
              const isDefault = boostValue === 1.0;

              return (
                <div
                  key={category}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isHigh ? 'border-green-300 bg-green-50' :
                    isLow ? 'border-gray-300 bg-gray-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        isHigh ? 'text-green-900' :
                        isLow ? 'text-gray-700' :
                        'text-blue-900'
                      }`}>
                        {category}
                      </span>
                      {isHigh && (
                        <Zap className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <span className={`text-lg font-bold ${
                      isHigh ? 'text-green-700' :
                      isLow ? 'text-gray-600' :
                      'text-blue-700'
                    }`}>
                      {boostValue.toFixed(1)}×
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={boostValue}
                    onChange={(e) => handleBoostChange(category, e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />

                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0.1× (Low)</span>
                    <span>1.0× (Default)</span>
                    <span>10× (High)</span>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => handleBoostChange(category, 0.5)}
                      className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      0.5×
                    </button>
                    <button
                      onClick={() => handleBoostChange(category, 1.0)}
                      className="flex-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                    >
                      1.0×
                    </button>
                    <button
                      onClick={() => handleBoostChange(category, 2.0)}
                      className="flex-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
                    >
                      2.0×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button (bottom) */}
      {hasChanges && (
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleReset}
            className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
          >
            Cancel Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
