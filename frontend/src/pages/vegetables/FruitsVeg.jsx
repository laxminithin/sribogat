import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import Image1 from "../../assets/images2/potato.avif";
import Image2 from "../../assets/images2/passionfruit.avif";
import Image3 from "../../assets/images2/apple.avif";
import Image4 from "../../assets/images2/blueberry.avif";
import Image5 from "../../assets/images2/cabbage.png";
import Image6 from "../../assets/images2/corn.avif";
import Image7 from "../../assets/images2/mushroom.jpeg";
import Image8 from "../../assets/images2/kiwi.avif";
import { useCart } from "../checkout/CartContext";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../checkout/AuthProvider';
const FreshVegetables = () => {
  const [notifications, setNotifications] = useState([]);

  const products = [
    {
      id: 1,
      name: "Fresh Potato",
      category: "Fresh Vegetables",
      price: 40,
      rating: 4.6,
      reviews: 178,
      image: Image1,
      unit: "kg",
      description: "Farm-fresh potatoes",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
    },
    {
      id: 2,
      name: "Passion Fruit",
      category: "Exotic Fruits",
      price: 150,
      rating: 4.5,
      reviews: 98,
      image: Image2,
      unit: "piece",
      description: "Tangy and aromatic tropical fruit",
    },
    {
      id: 3,
      name: "Apple",
      category: "Root Vegetables",
      price: 55,
      rating: 4.6,
      reviews: 156,
      image: Image3,
      unit: "kg",
      description: "Nutritious sweet potatoes",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      id: 4,
      name: "Organic Blueberry",
      category: "Organic Fruits",
      price: 160,
      rating: 4.5,
      reviews: 134,
      image: Image4,
      unit: "kg",
      description: "Sweet and juicy organic blueberries",
    },
    {
      id: 5,
      name: "Fresh Cabbage",
      category: "Fresh Vegetables",
      price: 45,
      rating: 4.6,
      reviews: 156,
      image: Image5,
      unit: "piece",
      description: "Crisp and fresh cabbage",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
    },
    {
      id: 6,
      name: "Fresh Corn",
      category: "Seasonal Vegetables",
      price: 40,
      rating: 4.5,
      reviews: 132,
      image: Image6,
      unit: "piece",
      description: "Sweet corn cobs",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      id: 7,
      name: "Mushroom",
      category: "Seasonal Vegetables",
      price: 60,
      rating: 4.6,
      reviews: 178,
      image: Image7,
      unit: "kg",
      description: "Fresh mushrooms",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
    },
    {
      id: 8,
      name: "Organic Kiwi",
      category: "Organic Fruits",
      price: 280,
      rating: 4.8,
      reviews: 98,
      image: Image8,
      unit: "500g",
      description: "Naturally grown, vitamin-rich kiwis",
    },
  ];

  const showNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message,
    };
    setNotifications((prev) => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
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
        <h1 className="text-3xl font-bold text-[#4CAF50] hover:text-[#45a049] transition-colors duration-300">
          Fresh Produce
        </h1>
        <p className="text-[#4CAF50] mt-2 text-lg hover:text-[#45a049] transition-colors duration-300">
          100% Natural, Pesticide-Free, and Chemical-Free Fruits & Vegetables
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
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
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-gray-600">{product.rating}</span>
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

      {notifications.map((note) => (
        <div key={note.id} className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-md transition-opacity duration-300">
          {note.message}
        </div>
      ))}
    </div>
  );
};

export default FreshVegetables;
