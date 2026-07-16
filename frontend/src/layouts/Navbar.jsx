import React, { useState, useEffect } from "react";
import { Menu, X, ShoppingCart, User, LogOut, Home, Package, Heart, BookOpen } from "lucide-react";
import { useCart } from "../pages/checkout/CartContext";
import { useAuth } from "../pages/checkout/AuthProvider";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logoImage from '../assets/Sri_Bogat_logo.png';

const Navbar = () => {
  const { state } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const cartCount = state.items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const quickLinks = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Cart', icon: ShoppingCart, path: '/checkout', badge: cartCount },
    ...(isAuthenticated ? [
      { name: 'Orders', icon: Package, path: '/orders' },
      { name: 'Wishlist', icon: Heart, path: '/wishlist' },
    ] : [])
  ];

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    setIsOpen(false);
  };

  // Helper function to check if a path is active
  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Helper function to get active/inactive styles for desktop navigation
  const getDesktopNavStyles = (path) => {
    const isActive = isActiveRoute(path);
    const baseStyles = "flex items-center space-x-2 font-medium px-4 py-2 rounded-full transition-all duration-300 hover:shadow-md hover:shadow-orange-200/30 hover:scale-105 border-2 hover:border-orange-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50";
    
    if (isActive) {
      return `${baseStyles} border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-md shadow-orange-200/30 scale-105`;
    }
    
    return `${baseStyles} border-transparent text-gray-700 hover:text-amber-800`;
  };

  // Helper function to get active/inactive styles for mobile navigation
  const getMobileNavStyles = (path) => {
    const isActive = isActiveRoute(path);
    const baseStyles = "flex items-center space-x-3 p-4 rounded-lg transition-all duration-300 group border-2 hover:border-orange-200 hover:scale-[1.02] transform hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50";
    
    if (isActive) {
      return `${baseStyles} border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 scale-[1.02]`;
    }
    
    return `${baseStyles} border-transparent`;
  };

  // Helper function to get active/inactive styles for quick links
  const getQuickLinkStyles = (path) => {
    const isActive = isActiveRoute(path);
    const baseStyles = "flex flex-col items-center p-3 rounded-lg transition-all duration-300 group relative border-2 hover:border-orange-200 hover:scale-105 transform hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50";
    
    if (isActive) {
      return `${baseStyles} border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 scale-105`;
    }
    
    return `${baseStyles} border-transparent`;
  };

  // Helper function to get text color for active/inactive states
  const getTextColor = (path) => {
    const isActive = isActiveRoute(path);
    return isActive ? "text-amber-800" : "text-gray-600 group-hover:text-amber-800";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Main navbar with brown theme */}
      <nav className={`bg-gradient-to-r from-white via-amber-50/80 to-white backdrop-blur-lg border-b-2 border-amber-200 transition-all duration-500 ${
        isScrolled ? 'shadow-2xl shadow-amber-200/20 bg-white/95 border-orange-300' : 'shadow-lg'
      }`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className={`flex justify-between items-center transition-all duration-300 ${
            isScrolled ? 'h-14 md:h-16' : 'h-16 md:h-20'
          }`}>
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo without box and brown color - bigger logo, smaller text */}
              <Link to="/" className="hover:opacity-90 transition-all duration-300 hover:scale-105 animate-fadeInLeft">
                <div className="flex items-center space-x-2 md:space-x-3">
                  {/* Logo Image - Made bigger */}
                  <img 
                     src={logoImage}
                    alt="Bogat Logo" 
                    className={`transition-all duration-300 object-contain ${
                      isScrolled ? 'h-10 w-10 md:h-12 md:w-12' : 'h-12 w-12 md:h-16 md:w-16'
                    }`}
                  />
                  {/* Logo Text - Made smaller and removed brown color */}
                  <div className={`font-bold tracking-wider transition-all duration-300 text-transparent bg-clip-text bg-gradient-to-r from-[#4B2E2B] to-[#dd9941] ${
                    isScrolled ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'
                  }`}>
                    SRI BOGAT
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation - Moved to left with active states */}
              <div className="hidden md:flex items-center space-x-6 animate-fadeIn">
                <Link 
                  to="/products"
                  className={getDesktopNavStyles('/products')}
                >
                  <span className="relative">
                    Our Products
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300 ${
                      isActiveRoute('/products') ? 'w-full' : 'w-0 hover:w-full'
                    }`}></span>
                  </span>
                </Link>
                
                <Link 
                  to="/blogs"
                  className={getDesktopNavStyles('/blogs')}
                >
                  <span className="relative">
                    Blog
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300 ${
                      isActiveRoute('/blogs') ? 'w-full' : 'w-0 hover:w-full'
                    }`}></span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Right side icons */}
            <div className="flex items-center space-x-3 md:space-x-6 animate-fadeInRight">
              {/* Desktop User section */}
              {isAuthenticated ? (
                <div className="relative profile-menu hidden md:block">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 md:space-x-3 text-gray-700 hover:text-amber-800 p-1 md:p-2 rounded-full hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-200/30 hover:scale-105 border-2 border-transparent hover:border-orange-200"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-100 to-orange-200 rounded-full flex items-center justify-center hover:from-amber-200 hover:to-orange-300 transition-all duration-300 shadow-md border border-orange-200 hover:animate-pulse">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-amber-800" />
                    </div>
                    <span className="hidden lg:block font-medium text-sm">{user.name}</span>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl py-2 z-50 border-2 border-amber-200 overflow-hidden animate-slideInDown">
                      <Link
                        to="/profile"
                        className={`block px-6 py-3 text-sm transition-all duration-200 hover:translate-x-2 hover:scale-[1.02] transform ${
                          isActiveRoute('/profile') ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800' : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800'
                        }`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        👤 Profile
                      </Link>
                      <Link
                        to="/orders"
                        className={`block px-6 py-3 text-sm transition-all duration-200 hover:translate-x-2 hover:scale-[1.02] transform ${
                          isActiveRoute('/orders') ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800' : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800'
                        }`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        📦 My Orders
                      </Link>
                      <Link
                        to="/wishlist"
                        className={`block px-6 py-3 text-sm transition-all duration-200 hover:translate-x-2 hover:scale-[1.02] transform ${
                          isActiveRoute('/wishlist') ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800' : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800'
                        }`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        💚 Wishlist
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className={`block px-6 py-3 text-sm transition-all duration-200 hover:translate-x-2 hover:scale-[1.02] transform ${
                            isActiveRoute('/admin') ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800' : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800'
                          }`}
                          onClick={() => setShowProfileMenu(false)}
                        >
                          ⚙️ Admin Dashboard
                        </Link>
                      )}
                      <hr className="my-2 border-amber-200" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-6 py-3 text-sm text-orange-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800 transition-all duration-200 hover:translate-x-2 hover:scale-[1.02] transform"
                      >
                        <div className="flex items-center space-x-2">
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`hidden md:block px-4 py-2 rounded-full transition-all duration-300 font-medium hover:shadow-md hover:shadow-orange-200/30 hover:scale-105 text-sm border-2 hover:border-orange-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 ${
                      isActiveRoute('/login') ? 'border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-md shadow-orange-200/30 scale-105' : 'border-transparent text-gray-700 hover:text-amber-800'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={`hidden md:block px-4 md:px-6 py-2 rounded-full transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:shadow-orange-300/50 hover:scale-105 hover:-translate-y-0.5 text-sm border-2 hover:border-orange-500 ${
                      isActiveRoute('/register') ? 'text-white bg-gradient-to-r from-orange-600 to-amber-700 border-orange-500' : 'text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 border-orange-400'
                    }`}
                  >
                    Register
                  </Link>
                </>
              )}

              {/* Desktop Cart icon */}
              <Link 
                to="/checkout" 
                className={`relative p-1 md:p-2 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-orange-200/30 hover:scale-110 group hidden md:flex border-2 hover:border-orange-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 ${
                  isActiveRoute('/checkout') ? 'border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-lg shadow-orange-200/30 scale-110' : 'border-transparent text-gray-700 hover:text-amber-800'
                }`}
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-bounce" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold shadow-lg animate-pulse hover:animate-none hover:scale-110 transition-all duration-200 border border-orange-400">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                className="md:hidden text-gray-700 hover:text-amber-800 p-2 rounded-full hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-300 hover:scale-110 border-2 border-transparent hover:border-orange-200"
                onClick={() => setIsOpen(!isOpen)}
              >
                <div className="relative w-6 h-6">
                  <Menu className={`w-6 h-6 absolute transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
                  <X className={`w-6 h-6 absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Mobile menu with brown theme */}
        <div
          className={`md:hidden bg-gradient-to-b from-white to-amber-50/50 backdrop-blur-lg border-t-2 border-amber-200 transition-all duration-500 overflow-hidden ${
            isOpen ? 'max-h-screen opacity-100 shadow-2xl' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Quick Navigation Links */}
          <div className="px-4 py-4 border-b border-amber-200/50">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</div>
            <div className={`grid gap-2 ${isAuthenticated ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {quickLinks.map((link, index) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={getQuickLinkStyles(link.path)}
                  onClick={() => setIsOpen(false)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative">
                    <link.icon className={`w-5 h-5 group-hover:scale-110 transition-transform duration-200 group-hover:rotate-12 ${
                      isActiveRoute(link.path) ? 'text-amber-800' : 'text-orange-600'
                    }`} />
                    {link.badge && link.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-lg border border-orange-400">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${getTextColor(link.path)}`}>{link.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Products & Blog links for mobile */}
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Explore</div>
            <div className="space-y-2">
              <Link
                to="/products"
                className={getMobileNavStyles('/products')}
                onClick={() => setIsOpen(false)}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200 group-hover:rotate-12">🛍️</span>
                <span className={`font-semibold ${
                  isActiveRoute('/products') ? 'text-amber-800' : 'text-gray-800 group-hover:text-amber-800'
                }`}>Our Products</span>
              </Link>
              
              <Link
                to="/blogs"
                className={getMobileNavStyles('/blogs')}
                onClick={() => setIsOpen(false)}
              >
                <BookOpen className={`w-6 h-6 group-hover:scale-110 transition-transform duration-200 group-hover:rotate-12 ${
                  isActiveRoute('/blogs') ? 'text-amber-800' : 'text-orange-600'
                }`} />
                <span className={`font-semibold ${
                  isActiveRoute('/blogs') ? 'text-amber-800' : 'text-gray-800 group-hover:text-amber-800'
                }`}>Blog Stories</span>
              </Link>
            </div>
          </div>

          {/* Mobile auth section with brown theme */}
          <div className="border-t-2 border-amber-200 py-4 px-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
            {isAuthenticated ? (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Account</div>
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    className={`flex items-center space-x-3 py-3 px-4 rounded-lg transition-all duration-300 hover:translate-x-2 border-2 hover:border-orange-200 hover:scale-[1.02] transform hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 ${
                      isActiveRoute('/profile') ? 'border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 scale-[1.02]' : 'border-transparent text-gray-600 hover:text-amber-800'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`flex items-center space-x-3 py-3 px-4 rounded-lg transition-all duration-300 hover:translate-x-2 border-2 hover:border-orange-200 hover:scale-[1.02] transform hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 ${
                        isActiveRoute('/admin') ? 'border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 scale-[1.02]' : 'border-transparent text-gray-600 hover:text-amber-800'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="text-lg">⚙️</span>
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full py-3 px-4 text-orange-600 hover:text-amber-800 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 rounded-lg transition-all duration-300 hover:translate-x-2 mt-4 border-2 border-transparent hover:border-orange-200 hover:scale-[1.02] transform"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Get Started</div>
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className={`block py-3 px-4 text-center rounded-lg transition-all duration-300 font-medium border-2 hover:border-orange-300 hover:scale-105 transform hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 ${
                      isActiveRoute('/login') ? 'border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 scale-105' : 'border-amber-200 text-gray-600 hover:text-amber-800'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={`block py-3 px-4 text-center rounded-lg transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 border-2 hover:border-orange-500 transform ${
                      isActiveRoute('/register') ? 'text-white bg-gradient-to-r from-orange-600 to-amber-700 border-orange-500' : 'text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 border-orange-400'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Create Account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fadeInLeft {
          animation: fadeInLeft 0.6s ease-out;
        }

        .animate-fadeInRight {
          animation: fadeInRight 0.6s ease-out;
        }

        .animate-slideInDown {
          animation: slideInDown 0.3s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Navbar;
