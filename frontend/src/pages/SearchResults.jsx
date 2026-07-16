import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Search, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi } from '../services/api';
import { resolveImageUrl } from '../config/config';
import { getPriceData } from '../utils/pricing';
import { useCart } from './checkout/CartContext';
import { useAuth } from './checkout/AuthProvider';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addSingleItem } = useCart();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const runSearch = async () => {
      try {
        setLoading(true);
        const products = await productsApi.searchProducts(query);
        setResults(Array.isArray(products) ? products : []);
      } catch (error) {
        console.error('Search failed:', error);
        toast.error('Failed to load search results');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [query]);

  const openProduct = (productId) => {
    navigate(`/products/${productId}`);
  };

  const addToCart = (event, product) => {
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    const success = addSingleItem({
      ...product,
      id: product._id || product.id,
      _id: product._id || product.id,
      image:
        resolveImageUrl(product.images?.[0] || product.image || product.imageUrl, '/api/placeholder/300/200'),
    });

    if (success) {
      toast.success(`${product.name} added to cart`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 pb-16 pt-32">
        <div className="mb-10 rounded-3xl border border-amber-100 bg-white/85 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-amber-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
              <p className="text-gray-600">
                {query ? `Showing results for "${query}"` : 'Start searching for products'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-white p-12 text-center text-gray-600">
            {query ? `No products found for "${query}".` : 'Type something in search to find products.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {results.map((product) => {
              const productId = product._id || product.id;
              const image = resolveImageUrl(
                product.images?.[0] || product.image || product.imageUrl,
                'https://via.placeholder.com/600x600/f5f5f5/9ca3af?text=Sri+Bogat'
              );

              return (
                <article
                  key={productId}
                  onClick={() => openProduct(productId)}
                  className="cursor-pointer overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <img src={image} alt={product.name} className="h-56 w-full object-cover" />
                  <div className="p-5">
                    <div className="mb-2 text-xs font-semibold text-amber-700">{product.category || product.brand || 'Sri Bogat'}</div>
                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                    <div className="mt-4 text-2xl font-bold text-amber-800">₹{getPriceData(product).totalPrice.toFixed(2)}</div>
                    {getPriceData(product).gstRate > 0 && (
                      <div className="text-xs text-gray-500">Inclusive of GST</div>
                    )}
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openProduct(productId);
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-300 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={(event) => addToCart(event, product)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 px-4 py-3 text-sm font-medium text-white transition hover:from-amber-700 hover:to-orange-800"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
