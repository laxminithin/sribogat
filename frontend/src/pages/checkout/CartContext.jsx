import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import toast from 'react-hot-toast';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      console.log('🛒 ADD_TO_CART reducer - payload received:', action.payload);
      console.log('💰 Payload price:', action.payload.price, typeof action.payload.price);
      console.log('📋 Payload fields:', Object.keys(action.payload));

      const existingItem = state.items.find(
        item => (item.id || item._id) === (action.payload.id || action.payload._id)
      );

      if (existingItem) {
        console.log('📦 Item exists, updating quantity');
        console.log('💰 Existing item price:', existingItem.price);
        
        const maxQty = existingItem.stock ?? Infinity;
        const newQuantity = existingItem.quantity + (action.payload.quantity || 1);

        if (newQuantity <= maxQty) {
          const updatedItems = state.items.map(item => {
            if ((item.id || item._id) === (action.payload.id || action.payload._id)) {
              const updated = { 
                ...item, 
                quantity: newQuantity,
                // ✅ PRESERVE the price from existing item or use new price
                price: item.price || action.payload.price || 0
              };
              console.log('📦 Updated item:', updated);
              return updated;
            }
            return item;
          });

          return {
            ...state,
            items: updatedItems,
          };
        } else {
          toast.error(`Only ${maxQty} items available in stock`);
          return state;
        }
      }

      // ✅ Adding new item - PRESERVE ALL FIELDS
      console.log('✨ Adding new item to cart');
      
      // ✅ CRITICAL FIX: Ensure price is properly converted and validated
      let finalPrice = 0;
      if (action.payload.price !== undefined && action.payload.price !== null) {
        finalPrice = Number(action.payload.price);
        if (isNaN(finalPrice)) {
          console.error('❌ Price conversion failed:', action.payload.price);
          finalPrice = 0;
        }
      }
      
      const newItem = {
        // ✅ CRITICAL: Spread the entire payload to preserve all fields
        ...action.payload,
        // ✅ Ensure essential fields are correct
        id: action.payload.id || action.payload._id,
        quantity: action.payload.quantity || 1,
        price: finalPrice // Use the validated price
      };

      console.log('✅ Final new item:', newItem);
      console.log('💰 Final item price:', newItem.price, typeof newItem.price);
      console.log('📋 Final item fields:', Object.keys(newItem));

      return {
        ...state,
        items: [...state.items, newItem],
      };
    }

    case 'INIT_CART':
      // ✅ Ensure loaded items have proper price format
      const itemsWithValidPrice = (action.payload || []).map(item => ({
        ...item,
        price: Number(item.price) || 0
      }));
      
      return {
        ...state,
        items: itemsWithValidPrice,
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(
          item => (item.id || item._id) !== action.payload.id
        ),
      };

    case 'UPDATE_QUANTITY': {
      const targetItem = state.items.find(
        item => (item.id || item._id) === action.payload.id
      );

      if (targetItem) {
        const maxQty = targetItem.stock ?? Infinity;

        if (action.payload.quantity > maxQty) {
          toast.error(`Only ${maxQty} items available in stock`);
          return state;
        }

        if (action.payload.quantity < 1) {
          return {
            ...state,
            items: state.items.filter(
              item => (item.id || item._id) !== action.payload.id
            ),
          };
        }
      }

      return {
        ...state,
        items: state.items.map(item =>
          (item.id || item._id) === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
};

const getInitialCart = (userId) => {
  try {
    const storedCart = localStorage.getItem(`cart_${userId}`);
    const parsed = storedCart ? JSON.parse(storedCart) : { items: [] };
    
    // ✅ Ensure all loaded items have proper price format
    if (parsed.items) {
      parsed.items = parsed.items.map(item => ({
        ...item,
        price: Number(item.price) || 0
      }));
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
    return { items: [] };
  }
};

export const CartProvider = ({ children }) => {
  const auth = useAuth();
  const loading = auth?.loading;
  const userId = auth?.user?._id || 'guest';

  const [state, dispatch] = useReducer(
    cartReducer,
    undefined,
    () => getInitialCart(userId)
  );

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading) {
      try {
        const storedCart = localStorage.getItem(`cart_${userId}`);
        const parsed = storedCart ? JSON.parse(storedCart) : { items: [] };
        
        // ✅ Ensure price format for loaded items
        if (parsed.items) {
          parsed.items = parsed.items.map(item => ({
            ...item,
            price: Number(item.price) || 0
          }));
        }
        
        console.log('Loaded cart for:', userId, parsed);
        dispatch({ type: 'INIT_CART', payload: parsed.items || [] });
        setInitialized(true);
      } catch (error) {
        console.error('Error loading cart:', error);
        setInitialized(true);
      }
    }
  }, [userId, loading]);

  useEffect(() => {
    if (!loading && initialized) {
      try {
        localStorage.setItem(`cart_${userId}`, JSON.stringify({ items: state.items }));
        console.log('Saved cart for:', userId, state.items);
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }
  }, [state.items, userId, loading, initialized]);

  const cartHelpers = {
    getItemQuantity: (productId) => {
      const item = state.items.find(item => (item.id || item._id) === productId);
      return item ? item.quantity : 0;
    },

    isInCart: (productId) => {
      return state.items.some(item => (item.id || item._id) === productId);
    },

    getTotalItems: () => {
      return state.items.reduce((total, item) => total + (item.quantity || 0), 0);
    },

    getCartTotal: () => {
      console.log('🧮 Calculating cart total...');
      
      const total = state.items.reduce((total, item, index) => {
        console.log(`📦 Item ${index}:`, item.name);
        
        // ✅ SIMPLIFIED: Just use the price field directly
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        const itemTotal = price * quantity;
        
        console.log(`💰 Price: ${price}, Quantity: ${quantity}, Total: ${itemTotal}`);
        
        return total + itemTotal;
      }, 0);
      
      console.log(`🏁 Final cart total: ${total}`);
      return total;
    },

    // ✅ FIXED: Enhanced addSingleItem with complete validation
    addSingleItem: (product) => {
      console.log('🛒 addSingleItem called with:', product);
      console.log('💰 Product price:', product.price, typeof product.price);
      
      const productId = product._id || product.id;
      if (!productId) {
        console.error('❌ Product ID is missing:', product);
        return false;
      }

      // ✅ CRITICAL: Validate price exists and is valid
      if (product.price === undefined || product.price === null) {
        console.error('❌ No price field in product!');
        console.log('Available fields:', Object.keys(product));
        toast.error('Product price not available');
        return false;
      }

      const validPrice = Number(product.price);
      if (isNaN(validPrice) || validPrice < 0) {
        console.error('❌ Invalid price:', product.price, '→', validPrice);
        toast.error('Invalid product price');
        return false;
      }

      // ✅ Create complete item with validated price
      const itemToAdd = {
        // Start with the complete product
        ...product,
        // Ensure critical fields
        id: productId,
        _id: productId,
        price: validPrice, // Use validated price
        quantity: 1,
        // Ensure we have essential display fields
        name: product.name || 'Unknown Product',
        image: product.image || product.images?.[0] || '/api/placeholder/300/200',
        stock: product.stock || 999
      };

      console.log('📤 Complete item being added:', itemToAdd);
      console.log('💰 Final price:', itemToAdd.price, typeof itemToAdd.price);

      dispatch({
        type: 'ADD_TO_CART',
        payload: itemToAdd
      });

      return true;
    },

    removeSingleItem: (productId) => {
      const currentQuantity = cartHelpers.getItemQuantity(productId);

      if (currentQuantity > 1) {
        dispatch({
          type: 'UPDATE_QUANTITY',
          payload: {
            id: productId,
            quantity: currentQuantity - 1,
          },
        });
        return true;
      } else if (currentQuantity === 1) {
        dispatch({
          type: 'REMOVE_FROM_CART',
          payload: { id: productId },
        });
        return true;
      }
      return false;
    },

    updateQuantity: (productId, quantity) => {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { id: productId, quantity: Number(quantity) || 0 }
      });
    },

    removeItem: (productId) => {
      dispatch({
        type: 'REMOVE_FROM_CART',
        payload: { id: productId },
      });
    },

    clearCart: () => {
      dispatch({ type: 'CLEAR_CART' });
    },

    // ✅ Debug helpers
    debugCart: () => {
      console.log('🐛 Current cart state:', state);
      state.items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          id: item.id || item._id,
          name: item.name,
          price: item.price,
          priceType: typeof item.price,
          quantity: item.quantity,
          total: Number(item.price) * Number(item.quantity)
        });
      });
      console.log('Total:', cartHelpers.getCartTotal());
    },

    debugCartItems: () => {
      console.log('🔍 DETAILED CART ITEM ANALYSIS:');
      state.items.forEach((item, index) => {
        console.log(`\n📦 Item ${index}:`);
        Object.keys(item).forEach(key => {
          console.log(`    ${key}: ${item[key]} (${typeof item[key]})`);
        });
      });
    }
  };

  if (loading) return <div>Loading cart...</div>;

  return (
    <CartContext.Provider value={{ state, dispatch, ...cartHelpers }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export default CartProvider;