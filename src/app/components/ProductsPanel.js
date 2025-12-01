'use client'
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  X,
  Save,
  ExternalLink,
  ShoppingCart,
  Star,
  Tag,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Archive,
} from 'lucide-react';

export default function ProductsPanel({ session, onboarding }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // For input display
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSoftCategory, setSelectedSoftCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, instock, outofstock
  const [processedFilter, setProcessedFilter] = useState('all'); // all, processed, unprocessed
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [softCategories, setSoftCategories] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    categories: 0,
    softCategories: 0,
    avgPrice: 0
  });
  
  const itemsPerPage = 20;
  const dbName = onboarding?.credentials?.dbName || '';

  // Helper: coerce any value to a safe string for rendering
  const safeText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : String(v))).join(', ');
    try { return String(value); } catch { return ''; }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch products from the database
  const fetchProducts = async (isFilterChange = false) => {
    if (!dbName) return;
    
    if (isFilterChange) {
      setFiltering(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dbName,
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          category: selectedCategory,
          type: selectedType,
          softCategory: selectedSoftCategory,
          status: statusFilter,
          processed: processedFilter
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.total || 0);
      setCategories(data.categories || []);
      setTypes(data.types || []);
      setSoftCategories(data.softCategories || []);
      setStats(data.stats || {
        total: 0,
        inStock: 0,
        outOfStock: 0,
        categories: 0,
        softCategories: 0,
        avgPrice: 0
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  // Load products when dbName changes (initial load)
  useEffect(() => {
    if (dbName) {
      fetchProducts(false);
    }
  }, [dbName]);

  // Load products when page changes
  useEffect(() => {
    if (dbName && currentPage > 1) {
      fetchProducts(true);
    }
  }, [currentPage]);

  // Load products when filters change
  useEffect(() => {
    if (dbName) {
      setCurrentPage(1);
      fetchProducts(true);
    }
  }, [searchTerm, selectedCategory, selectedType, selectedSoftCategory, statusFilter, processedFilter]);



  // Handle product edit
  const handleEdit = (product) => {
    setEditingProduct({ ...product });
    setShowModal(true);
  };

  // Handle product save
  const handleSave = async () => {
    if (!editingProduct) return;
    
    // Ensure type is converted to array if it's still a string
    let finalType = editingProduct.type;
    if (typeof finalType === 'string') {
      finalType = finalType.split(',').map(t => t.trim()).filter(Boolean);
    }
    
    try {
      const response = await fetch('/api/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName,
          productId: editingProduct.id,
          updates: {
            name: editingProduct.name,
            description1: editingProduct.description1,
            category: editingProduct.category,
            type: finalType,
            price: editingProduct.price
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Update local state with the final type array
      const updatedProduct = { ...editingProduct, type: finalType };
      setProducts(products.map(p => 
        p.id === editingProduct.id ? updatedProduct : p
      ));
      
      setShowModal(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl">
          <div className="relative p-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Products Management</h1>
              <p className="text-indigo-100">
                Manage and monitor your product catalog
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Total Products</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">In Stock</p>
              <p className="text-2xl font-bold text-green-300">{stats.inStock}</p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400">{stats.outOfStock}</p>
            </div>
            <div className="p-4 backdrop-blur-sm bg-white/10 rounded-xl">
              <p className="text-white/70 text-sm mb-1">Avg Price</p>
              <p className="text-2xl font-bold text-white">${stats.avgPrice}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => {
                const label = safeText(cat);
                return (
                  <option key={label} value={label}>{label}</option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              {types.map(type => {
                const label = safeText(type);
                return (
                  <option key={label} value={label}>{label}</option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Soft Category</label>
            <select
              value={selectedSoftCategory}
              onChange={(e) => setSelectedSoftCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Soft Categories</option>
              {softCategories.map(softCat => {
                const label = safeText(softCat);
                return (
                  <option key={label} value={label}>{label}</option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Products</option>
              <option value="instock">In Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Processing</label>
            <select
              value={processedFilter}
              onChange={(e) => setProcessedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Products</option>
              <option value="processed">Processed</option>
              <option value="unprocessed">Unprocessed</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchInput('');
                setSelectedCategory('');
                setSelectedType('');
                setSelectedSoftCategory('');
                setStatusFilter('all');
                setProcessedFilter('all');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 relative">
        {filtering && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-indigo-600">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Filtering products...</span>
            </div>
          </div>
        )}
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Products ({totalProducts})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Soft Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {safeText(product.name)}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {safeText(product.description1 || product.description) || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {Array.isArray(product.category) && product.category.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.category.map((cat, index) => (
                          <span
                            key={`${index}-${safeText(cat)}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {safeText(cat)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {Array.isArray(product.type) && product.type.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.type.map((type, index) => (
                          <span
                            key={`${index}-${safeText(type)}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {safeText(type)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {Array.isArray(product.softCategory) && product.softCategory.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.softCategory.map((softCat, index) => (
                          <span
                            key={`${index}-${safeText(softCat)}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {safeText(softCat)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.price ? `$${parseFloat(product.price).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {product.stockStatus === 'outofstock' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Archive className="h-3 w-3 mr-1" />
                        Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} products
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Product</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingProduct.description1 || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description1: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types (comma-separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editingProduct.type) ? editingProduct.type.join(', ') : (editingProduct.type || '')}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Store the raw input value temporarily for display
                    setEditingProduct({
                      ...editingProduct, 
                      type: inputValue, // Keep as string while typing
                      _typeInput: inputValue // Store raw input for reference
                    });
                  }}
                  onBlur={(e) => {
                    // Convert to array when user finishes typing
                    const inputValue = e.target.value;
                    const typesArray = inputValue.split(',').map(t => t.trim()).filter(Boolean);
                    setEditingProduct({
                      ...editingProduct, 
                      type: typesArray,
                      _typeInput: undefined // Clear temporary input
                    });
                  }}
                  placeholder="e.g., כשר, במבצע, חדש, אורגני"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Type new product types separated by commas. Press Tab or click elsewhere to save them.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 