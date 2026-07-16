import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart, ShoppingCart, Sparkles, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, usersApi } from '../../services/api';
import { resolveImageUrl } from '../../config/config';
import { useCart } from '../checkout/CartContext';
import { useAuth } from '../checkout/AuthProvider';

const ProductCatalog = ({ showAll = false }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addSingleItem, getItemQuantity } = useCart();

  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [showAll]);

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setWishlist(new Set());
    }
  }, [isAuthenticated]);

  const featuredProducts = useMemo(() => {
    if (showAll) return products;
    return products.slice(0, 8);
  }, [products, showAll]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;

      if (showAll) {
        data = await productsApi.getAllProducts();
      } else {
        data = await productsApi.getFeaturedProducts(8);
        if (!Array.isArray(data) || data.length === 0) {
          data = await productsApi.getAllProducts();
        }
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const items = await usersApi.getWishlist();
      setWishlist(new Set(items.map((item) => item._id || item.id)));
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    }
  };

  const getProductId = (product) => product?._id || product?.id;

  const getProductImage = (product) => {
    const image = product?.images?.[0] || product?.image || product?.imageUrl;
    return resolveImageUrl(image, 'https://via.placeholder.com/600x600/f5f5f5/9ca3af?text=Sri+Bogat');
  };

  const handleOpenProduct = (productId) => {
    if (!productId) {
      toast.error('Product not available');
      return;
    }

    navigate(`/products/${productId}`);
  };

  const handleAddToCart = (event, product) => {
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if ((product.stock || 0) < 1 || product.status === 'inactive') {
      toast.error('This product is not available right now');
      return;
    }

    const success = addSingleItem({
      ...product,
      id: getProductId(product),
      _id: getProductId(product),
      image: getProductImage(product),
      images: product.images?.length ? product.images : [getProductImage(product)],
    });

    if (success) {
      toast.success(`${product.name} added to cart`);
    }
  };

  const handleToggleWishlist = async (event, product) => {
    event.stopPropagation();

    const productId = getProductId(product);
    if (!productId) return;

    if (!isAuthenticated) {
      toast.error('Please login to use wishlist');
      navigate('/login');
      return;
    }

    try {
      const nextWishlist = new Set(wishlist);

      if (nextWishlist.has(productId)) {
        await usersApi.removeFromWishlist(productId);
        nextWishlist.delete(productId);
        toast.success('Removed from wishlist');
      } else {
        await usersApi.addToWishlist(productId);
        nextWishlist.add(productId);
        toast.success('Added to wishlist');
      }

      setWishlist(nextWishlist);
    } catch (err) {
      console.error('Wishlist update failed:', err);
      toast.error('Failed to update wishlist');
    }
  };

  if (loading) {
    return (
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center py-24">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-lg">
            <p className="text-lg font-semibold text-gray-800">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-4 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 px-5 py-2 text-sm font-medium text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Premium Sri Bogat Collection
            </div>
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              {showAll ? 'Our Products' : 'Shop Best Sellers'}
            </h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              Browse live products from the backend, open full product details, and move straight into cart and checkout.
            </p>
          </div>

          {!showAll && (
            <button
              onClick={() => navigate('/products')}
              className="rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-medium text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
            >
              View All Products
            </button>
          )}
        </div>

        {featuredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-white/70 p-12 text-center text-gray-600">
            Products will appear here once they are added in admin.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.map((product) => {
              const productId = getProductId(product);
              const inCartQty = getItemQuantity(productId);
              const isUnavailable = product.status === 'inactive' || (product.stock || 0) < 1;

              return (
                <article
                  key={productId}
                  onClick={() => handleOpenProduct(productId)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-amber-50">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <button
                      onClick={(event) => handleToggleWishlist(event, product)}
                      className="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow-sm"
                    >
                      <Heart
                        className={`h-4 w-4 ${wishlist.has(productId) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                      />
                    </button>

                    {isUnavailable && (
                      <div className="absolute left-4 top-4 rounded-full bg-gray-900/85 px-3 py-1 text-xs font-semibold text-white">
                        {(product.stock || 0) < 1 ? 'Out of Stock' : 'Unavailable'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{product.brand || 'Sri Bogat'}</span>
                    </div>

                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{product.description}</p>

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-2xl font-bold text-amber-800">₹{Number(product.price || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">/{product.unit || 'unit'}</div>
                      </div>
                      {inCartQty > 0 && (
                        <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {inCartQty} in cart
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenProduct(productId);
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-300 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
                      >
                        <Eye className="h-4 w-4" />
                        View Product
                      </button>
                      <button
                        onClick={(event) => handleAddToCart(event, product)}
                        disabled={isUnavailable}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 px-4 py-3 text-sm font-medium text-white transition hover:from-amber-700 hover:to-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
