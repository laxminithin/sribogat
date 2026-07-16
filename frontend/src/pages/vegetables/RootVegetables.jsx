import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import Image1 from "../../assets/images2/carrot.avif"
import Image2 from "../../assets/images2/radish.avif"
import Image3 from "../../assets/images2/potato.avif"
import Image4 from "../../assets/images2/beetroot.jpg"
import Image5 from "../../assets/images2/ginger.avif"
import Image6 from "../../assets/images2/garlic.avif"
import Image7 from "../../assets/images2/beetroot.jpg"
import Image8 from "../../assets/images2/carrot.avif"
import { useCart } from "../checkout/CartContext";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../checkout/AuthProvider';

const RootVegetables = () => {
  const [notifications, setNotifications] = useState([]);
  
  const rootVegetables = [
    {
      id: 'root-fruit-1',
      name: "Fresh Carrot",
      category: "Root Vegetables",
      price: 45,
      rating: 4.7,
      reviews: 182,
      image: Image1,
      unit: "kg",
      description: "Sweet orange carrots",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700"
    },
    {
      id: 'root-fruit-2',
      name: "Fresh Radish",
      category: "Root Vegetables",
      price: 30,
      rating: 4.4,
      reviews: 145,
      image: Image2,
      unit: "kg",
      description: "Crispy red radishes",
      bgColor: "bg-red-50",
      textColor: "text-red-700"
    },
    {
      id: 'root-fruit-3',
      name: "Sweet Potato",
      category: "Root Vegetables",
      price: 55,
      rating: 4.6,
      reviews: 156,
      image: Image3,
      unit: "kg",
      description: "Nutritious sweet potatoes",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700"
    },
    {
      id: 'root-fruit-4',
      name: "Fresh Turnip",
      category: "Root Vegetables",
      price: 40,
      rating: 4.3,
      reviews: 128,
      image: Image4,
      unit: "kg",
      description: "White turnips",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700"
    },
    {
      id: 'root-fruit-5',
      name: "Fresh Ginger",
      category: "Root Vegetables",
      price: 160,
      rating: 4.8,
      reviews: 172,
      image: Image5,
      unit: "kg",
      description: "Fresh ginger root",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700"
    },
    {
      id: 'root-fruit-6',
      name: "Fresh Garlic",
      category: "Root Vegetables",
      price: 140,
      rating: 4.7,
      reviews: 165,
      image: Image6,
      unit: "kg",
      description: "Premium garlic bulbs",
      bgColor: "bg-stone-50",
      textColor: "text-stone-700"
    },
    {
      id: 'root-fruit-7',
      name: "Fresh Beetroot",
      category: "Root Vegetables",
      price: 50,
      rating: 4.5,
      reviews: 138,
      image: Image7,
      unit: "kg",
      description: "Red beetroots",
      bgColor: "bg-rose-50",
      textColor: "text-rose-700"
    },
    {
      id: 'root-fruit-8',
      name: "Fresh Yam",
      category: "Root Vegetables",
      price: 65,
      rating: 4.4,
      reviews: 125,
      image: Image8,
      unit: "kg",
      description: "Purple yam",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700"
    }
  ];

  const showNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message
    };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 3000);
  };

  const navigate = useNavigate(); // ✅ define navigate here
  const { dispatch } = useCart();
  const { user } = useAuth();

  const handleAddToCart = (product) => {
    if (!user) {
      navigate('/login'); // ✅ works now
      return;
    }

    dispatch({ type: "ADD_TO_CART", payload: product });
    showNotification(`Added ${product.name} to cart!`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 pt-20">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 hover:text-green-700 transition-colors duration-300">
          Root Vegetables
        </h1>
        <p className="text-green-600 mt-2 text-lg hover:text-green-700 transition-colors duration-300">
          Fresh root vegetables sourced directly from farmers
        </p>
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-green-600 text-white px-4 py-2 rounded-lg mb-2 shadow-lg animate-fade-in"
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {rootVegetables.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
          >
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className={`w-full h-48 items-center justify-center ${product.bgColor} hidden`}
              >
                <div className="text-center p-4">
                  <span className={`font-medium ${product.textColor} text-lg`}>
                    {product.name}
                  </span>
                  <p className={`${product.textColor} text-sm mt-2`}>
                    {product.description}
                  </p>
                </div>
              </div>
              <button 
                className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className="w-5 h-5 text-gray-600 hover:text-green-600 transition-colors" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-sm text-green-600 font-medium mb-1 capitalize">
                {product.category}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 hover:text-green-600 transition-colors">
                {product.name}
              </h3>
              
              <div className="flex items-center mt-2">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-gray-600">{product.rating}</span>
                </div>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-600">{product.reviews} reviews</span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-lg font-bold text-gray-800 hover:text-green-600 transition-colors">
                  ₹{product.price}
                  <span className="text-sm text-gray-600 font-normal">/{product.unit}</span>
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-300"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RootVegetables;