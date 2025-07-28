'use client'
import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Package,
  Clock,
  TrendingUp
} from 'lucide-react';

export default function ProcessingProgress({ 
  totalProducts, 
  processedProducts, 
  currentProduct, 
  isProcessing, 
  error 
}) {
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Calculate progress percentage
  useEffect(() => {
    if (totalProducts > 0) {
      const percentage = (processedProducts / totalProducts) * 100;
      setProgress(Math.min(percentage, 100));
    }
  }, [processedProducts, totalProducts]);

  // Calculate ETA
  useEffect(() => {
    if (isProcessing && processedProducts > 0 && startTime) {
      const elapsed = Date.now() - startTime;
      const avgTimePerProduct = elapsed / processedProducts;
      const remainingProducts = totalProducts - processedProducts;
      const estimatedTime = avgTimePerProduct * remainingProducts;
      
      if (estimatedTime > 0) {
        const minutes = Math.floor(estimatedTime / 60000);
        const seconds = Math.floor((estimatedTime % 60000) / 1000);
        setEta({ minutes, seconds });
      }
    }
  }, [processedProducts, totalProducts, isProcessing, startTime]);

  // Set start time when processing begins
  useEffect(() => {
    if (isProcessing && !startTime) {
      setStartTime(Date.now());
    }
  }, [isProcessing, startTime]);

  const getProgressColor = () => {
    if (error) return 'bg-red-500';
    if (progress >= 100) return 'bg-green-500';
    return 'bg-indigo-500';
  };

  const getProgressText = () => {
    if (error) return 'שגיאה בעיבוד';
    if (progress >= 100) return 'העיבוד הושלם!';
    return 'מעבד מוצרים...';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {isProcessing && progress < 100 ? (
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mr-3" />
          ) : progress >= 100 ? (
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
          ) : error ? (
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
          ) : (
            <Package className="h-6 w-6 text-gray-600 mr-3" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getProgressText()}
            </h3>
            <p className="text-sm text-gray-600">
              עיבוד מוצרים עבור חיפוש חכם
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {Math.round(progress)}%
          </div>
          <div className="text-sm text-gray-500">
            {processedProducts} / {totalProducts}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full relative`}
            style={{ width: `${progress}%` }}
          >
            {isProcessing && progress < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-indigo-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">סה"כ מוצרים</p>
              <p className="text-lg font-semibold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">עובדו</p>
              <p className="text-lg font-semibold text-gray-900">{processedProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">ממתינים</p>
              <p className="text-lg font-semibold text-gray-900">{totalProducts - processedProducts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Product Info */}
      {isProcessing && currentProduct && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-indigo-900">מעבד כעת:</span>
            </div>
            <span className="text-sm text-indigo-700 font-medium">
              {currentProduct.name || currentProduct.title || 'מוצר'}
            </span>
          </div>
        </div>
      )}

      {/* ETA */}
      {isProcessing && eta && progress < 100 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-900">
              זמן משוער לסיום: {eta.minutes > 0 ? `${eta.minutes} דקות` : ''} {eta.seconds} שניות
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress >= 100 && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-800">
              כל המוצרים עובדו בהצלחה! החיפוש החכם שלך מוכן לשימוש.
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 