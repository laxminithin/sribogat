import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../pages/checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, Box, ShoppingCart, Users, LineChart, TicketPercent, Settings } from 'lucide-react';

// Brown-themed AdminSidebar component
const AdminSidebar = ({ isOpen, onClose, isMinimized, onToggleMinimize }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  

const navItems = [
  {name: 'Home', icon: <User className="w-5 h-5" />, path: '/'  },
  { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin' },
  { name: 'Products', icon: <Box className="w-5 h-5" />, path: '/admin/products' },
  { name: 'Orders', icon: <ShoppingCart className="w-5 h-5" />, path: '/admin/orders' },
  { name: 'Users', icon: <Users className="w-5 h-5" />, path: '/admin/customers' },
  { name: 'Analytics', icon: <LineChart className="w-5 h-5" />, path: '/admin/analytics' },
  { name: 'Coupons', icon: <TicketPercent className="w-5 h-5" />, path: '/admin/coupons' },
  { name: 'Site Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' }
];
  const handleNavigation = (path) => {
    navigate(path);
    // Close mobile menu when navigating
    onClose();
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-gradient-to-b from-amber-50 to-orange-50 shadow-xl z-50 transition-all duration-300 ease-in-out border-r border-amber-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isMinimized ? 'w-16 lg:w-16' : 'w-64 lg:w-64'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-200 bg-amber-100/50">
          {!isMinimized && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-xl font-bold text-amber-900">Admin</h1>
            </div>
          )}
          
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-amber-200/50 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-amber-700" />
          </button>
          
          {/* Desktop Minimize Button */}
          <button
            onClick={onToggleMinimize}
            className="hidden lg:block p-1 rounded-md hover:bg-amber-200/50 transition-colors duration-200"
          >
            {isMinimized ? (
              <ChevronRight className="w-5 h-5 text-amber-700" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-amber-700" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group
                hover:bg-amber-200/70 hover:text-amber-900 hover:shadow-sm
                ${isActiveRoute(item.path) 
                  ? 'bg-gradient-to-r from-amber-300/80 to-orange-300/80 text-amber-900 shadow-md border-r-3 border-amber-600 font-medium' 
                  : 'text-amber-800 hover:font-medium'
                }
                ${isMinimized ? 'justify-center' : ''}
              `}
              title={isMinimized ? item.name : ''}
            >
              <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
              {!isMinimized && (
                <span className="font-medium tracking-wide">{item.name}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {!isMinimized && (
          <div className="p-4 border-t border-amber-200 bg-amber-100/30">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-amber-200/50 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-amber-900 truncate">
                    Admin User
                  </p>
                  <p className="text-xs text-amber-700 truncate">
                    admin@example.com
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-600 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-amber-300 rounded-lg shadow-lg py-2 z-10">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * AdminLayout Component with Brown Color Scheme
 * Responsive wrapper for admin pages with collapsible sidebar
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 */
const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // State for mobile menu and sidebar minimization
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mobileUserDropdownOpen, setMobileUserDropdownOpen] = useState(false);
  const mobileDropdownRef = useRef(null);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
        setMobileUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMobileLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (!isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      {/* Main Content */}
      <div className={`
        flex-1 transition-all duration-300 ease-in-out
        ${isMinimized ? 'lg:ml-16' : 'lg:ml-64'}
        ml-0
      `}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-gradient-to-r from-amber-100 to-orange-100 shadow-sm border-b border-amber-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-md hover:bg-amber-200/50 transition-colors duration-200"
              >
                <Menu className="w-6 h-6 text-amber-700" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <h1 className="text-lg font-bold text-amber-900">Admin Panel</h1>
              </div>
            </div>
            
            {/* Mobile User Menu */}
            <div className="flex items-center space-x-3">
              <div className="relative" ref={mobileDropdownRef}>
                <button
                  onClick={() => setMobileUserDropdownOpen(!mobileUserDropdownOpen)}
                  className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center hover:from-amber-500 hover:to-orange-600 transition-all duration-200 shadow-sm"
                >
                  <User className="w-4 h-4 text-white" />
                </button>

                {/* Mobile Dropdown Menu */}
                {mobileUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-amber-300 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-amber-200 bg-amber-50/50">
                      <p className="text-sm font-medium text-amber-900">Admin User</p>
                      <p className="text-xs text-amber-700">admin@example.com</p>
                    </div>
                    <button
                      onClick={handleMobileLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-left hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
