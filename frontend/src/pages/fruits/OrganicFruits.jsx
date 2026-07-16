import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import Image1 from "../../assets/images2/apple.avif"
import Image2 from "../../assets/images2/banana.avif"
import Image3 from "../../assets/images2/dragon.avif"
import Image4 from "../../assets/images2/blueberry.avif"
import Image5 from "../../assets/images2/papaya.avif"
import Image6 from "../../assets/images2/pomegranate.avif"
import Image7 from "../../assets/images2/grapes.avif"
import Image8 from "../../assets/images2/kiwi.avif"
import { useCart } from "../checkout/CartContext";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../checkout/AuthProvider';
const OrganicFruits = () => {
  const [notifications, setNotifications] = useState([]);
  
  const organicFruits = [
    {
      id:'fruits-1',
      name: "Organic Apple",
      category: "Organic Fruits",
      price: 220,
      rating: 4.8,
      reviews: 165,
      image: Image1,
      unit: "kg",
      description: "Pesticide-free, naturally grown apples"
    },
    {
      id: 'fruits-2',
      name: "Organic Banana",
      category: "Organic Fruits",
      price: 80,
      rating: 4.6,
      reviews: 142,
      image: Image2,
      unit: "dozen",
      description: "Chemical-free, naturally ripened bananas"
    },
    {
      id: 'fruits-3',
      name: "Organic Dragon",
      category: "Organic Fruits",
      price: 180,
      rating: 4.7,
      reviews: 128,
      image: Image3,
      unit: "250g",
      description: "Fresh, pesticide-free strawberries"
    },
    {
      id: 'fruits-4',
      name: "Organic Blueberry",
      category: "Organic Fruits",
      price: 160,
      rating: 4.5,
      reviews: 134,
      image: Image4,
      unit: "kg",
      description: "Sweet and juicy organic oranges"
    },
    {
      id:'fruits-5',
      name: "Organic Papaya",
      category: "Organic Fruits",
      price: 320,
      rating: 4.9,
      reviews: 156,
      image: Image5,
      unit: "200g",
      description: "Antioxidant-rich organic blueberries"
    },
    {
      id: 'fruits-6',
      name: "Organic Pomegranate",
      category: "Organic Fruits",
      price: 240,
      rating: 4.7,
      reviews: 112,
      image: Image6,
      unit: "piece",
      description: "Chemical-free, naturally grown pomegranates"
    },
    {
      id: 'fruits-7',
      name: "Organic Grapes",
      category: "Organic Fruits",
      price: 190,
      rating: 4.6,
      reviews: 145,
      image: Image7,
      unit: "500g",
      description: "Pesticide-free, sweet organic grapes"
    },
    {
      id: 'fruits-8',
      name: "Organic Kiwi",
      category: "Organic Fruits",
      price: 280,
      rating: 4.8,
      reviews: 98,
      image: Image8,
      unit: "500g",
      description: "Naturally grown, vitamin-rich kiwis"
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
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#4CAF50] hover:text-[#45a049] transition-colors duration-300">
          Organic Fruits
        </h1>
        <p className="text-[#4CAF50] mt-2 text-lg hover:text-[#45a049] transition-colors duration-300">
          100% Natural, Pesticide-Free, and Chemical-Free Fruits
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {organicFruits.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
          >
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <button className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors">
                <Heart className="w-5 h-5 text-gray-600 hover:text-[#4CAF50] transition-colors" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-sm text-green-600 font-medium mb-1 capitalize">
                {product.category}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 hover:text-[#4CAF50] transition-colors">
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
                <div className="text-lg font-bold text-gray-800 hover:text-[#4CAF50] transition-colors">
                  ₹{product.price}
                  <span className="text-sm text-gray-600 font-normal">/{product.unit}</span>
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-[#45a049] transition-colors duration-300"
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

export default OrganicFruits;