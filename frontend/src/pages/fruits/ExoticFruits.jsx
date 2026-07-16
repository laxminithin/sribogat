import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import Image1 from "../../assets/images2/dragon.avif"
import Image2 from "../../assets/images2/passionfruit.avif" 
import Image3 from "../../assets/images2/rambutan.jpg"
import Image4 from "../../assets/images2/mangosteen.avif"
import Image5 from "../../assets/images2/durian.avif"
import Image6 from "../../assets/images2/kiwi.avif"
import Image7 from "../../assets/images2/litchi.avif"
import Image8 from "../../assets/images2/kumquat.avif"
import { useCart } from "../checkout/CartContext";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../checkout/AuthProvider';
const ExoticFruits = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const exoticFruits = [
    {
      id: 'fruit-a',
      name: "Dragon Fruit",
      category: "Exotic Fruits",
      price: 280,
      rating: 4.7,
      reviews: 142,
      image: Image1,
      unit: "piece",
      description: "Vibrant pink flesh with black seeds"
    },
    {
      id: 'fruit-0',
      name: "Passion Fruit",
      category: "Exotic Fruits",
      price: 150,
      rating: 4.5,
      reviews: 98,
      image: Image2,
      unit: "piece",
      description: "Tangy and aromatic tropical fruit"
    },
    {
      id:'fruit-1',
      name: "Rambutan",
      category: "Exotic Fruits",
      price: 220,
      rating: 4.6,
      reviews: 115,
      image: Image3,
      unit: "100g",
      description: "Sweet and juicy with hairy exterior"
    },
    {
      id:'fruit-2',
      name: "Mangosteen",
      category: "Exotic Fruits",
      price: 350,
      rating: 4.8,
      reviews: 167,
      image: Image4,
      unit: "100g",
      description: "Queen of tropical fruits"
    },
    {
      id:'fruit-3',
      name: "Durian",
      category: "Exotic Fruits",
      price: 800,
      rating: 4.4,
      reviews: 189,
      image: Image5,
      unit: "kg",
      description: "King of fruits with unique aroma"
    },
    {
      id: 'fruit-4',
      name: "Kiwi Berry",
      category: "Exotic Fruits",
      price: 420,
      rating: 4.6,
      reviews: 94,
      image: Image6,
      unit: "100g",
      description: "Mini kiwis with sweet flavor"
    },
    {
      id: 'fruit-5',
      name: "Lychee",
      category: "Exotic Fruits",
      price: 180,
      rating: 4.5,
      reviews: 156,
      image: Image7,
      unit: "100g",
      description: "Sweet and fragrant white flesh"
    },
    {
      id:'fruit-6',
      name: "Kumquat",
      category: "Exotic Fruits",
      price: 160,
      rating: 4.3,
      reviews: 87,
      image: Image8,
      unit: "100g",
      description: "Tiny citrus fruits eaten whole"
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

    const { dispatch } = useCart(); // ✅ get dispatch from CartContext

  const { user } = useAuth(); // ✅ check if user is logged in

  const handleAddToCart = (product) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login'); // 🔁 adjust route if your login path is different
      return;
    }

    dispatch({ type: "ADD_TO_CART", payload: product });
    showNotification(`Added ${product.name} to cart!`);
  };
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#4CAF50] hover:text-[#45a049] transition-colors duration-300">
          Exotic Fruits
        </h1>
        <p className="text-[#4CAF50] mt-2 text-lg hover:text-[#45a049] transition-colors duration-300">
          Discover rare and unique fruits from around the world
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {exoticFruits.map((product) => (
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

export default ExoticFruits;