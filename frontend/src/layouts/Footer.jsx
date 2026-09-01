import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  MapPin,
  Phone,
  Mail,
  Clock,
  Coffee,
  Heart
} from 'lucide-react';

import { useSiteSettings } from '../contexts/SiteSettingsContext';

const Footer = () => {
  const { settings } = useSiteSettings();

  return (
    <footer style={{ backgroundColor: '#823000' }}>
 
    {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2 gap-8">
          
          {/* Company Info - Spans 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div 
                className="p-2 rounded-full mr-3"
                style={{ 
                  background: `linear-gradient(135deg, #f59b52 0%, #ffe5b8 100%)` 
                }}
              >
                <Coffee className="w-6 h-6" style={{ color: '#823000' }} />
              </div>
              <h2 className="text-2xl font-bold text-white">
                BOGAT
              </h2>
            </div>
            <p className="text-white/80 mb-6 max-w-md leading-relaxed">
              {settings.footerDescription}
            </p>
            
           
            {/* Social Media */}
            <div className="flex space-x-3">
              <a 
                href="#" 
                className="p-2 rounded-full transition-all duration-300 hover:transform hover:scale-110"
                style={{ 
                  backgroundColor: 'rgba(245, 155, 82, 0.2)',
                  border: '2px solid rgba(245, 155, 82, 0.3)'
                }}
              >
                <Facebook className="w-5 h-5" style={{ color: '#f59b52' }} />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-full transition-all duration-300 hover:transform hover:scale-110"
                style={{ 
                  backgroundColor: 'rgba(245, 155, 82, 0.2)',
                  border: '2px solid rgba(245, 155, 82, 0.3)'
                }}
              >
                <Twitter className="w-5 h-5" style={{ color: '#f59b52' }} />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-full transition-all duration-300 hover:transform hover:scale-110"
                style={{ 
                  backgroundColor: 'rgba(245, 155, 82, 0.2)',
                  border: '2px solid rgba(245, 155, 82, 0.3)'
                }}
              >
                <Instagram className="w-5 h-5" style={{ color: '#f59b52' }} />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-full transition-all duration-300 hover:transform hover:scale-110"
                style={{ 
                  backgroundColor: 'rgba(245, 155, 82, 0.2)',
                  border: '2px solid rgba(245, 155, 82, 0.3)'
                }}
              >
                <Youtube className="w-5 h-5" style={{ color: '#f59b52' }} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">
              Explore
            </h3>
            <ul className="space-y-2">
              {[
                'Premium Coffee',
                'Authentic Spices',
                'Heritage Collection',
                
              ].map((link) => (
                <li key={link}>
                  <Link 
                    to="/products" 
                    className="text-white/70 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                    style={{ 
                      borderBottom: '1px solid transparent' 
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderBottomColor = '#f59b52';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderBottomColor = 'transparent';
                    }}
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">
              Get in Touch
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 mt-0.5" style={{ color: '#f59b52' }} />
                <div>
                  <div className="font-semibold text-white">Call Us</div>
                  <span className="text-white/70 text-sm">{settings.contactPhone}</span>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 mt-0.5" style={{ color: '#f59b52' }} />
                <div>
                  <div className="font-semibold text-white">Email Us</div>
                  <span className="text-white/70 text-sm">{settings.contactEmail}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div 
        className="text-white border-t"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderTopColor: 'rgba(245, 155, 82, 0.3)'
        }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0">
            <div className="flex items-center text-sm">
              <Heart className="w-4 h-4 mr-2" style={{ color: '#f59b52' }} />
              <span className="text-white/80">{settings.footerCopyright}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link 
                to="/policy" 
                className="text-white/70 hover:text-white text-sm transition-colors duration-300"
                style={{ 
                  borderBottom: '1px solid transparent' 
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#f59b52';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              >
                Privacy Policy
              </Link>
              <span style={{ color: '#f59b52' }}>•</span>
              <Link 
                to="/policy" 
                className="text-white/70 hover:text-white text-sm transition-colors duration-300"
                style={{ 
                  borderBottom: '1px solid transparent' 
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#f59b52';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              >
                Terms of Service
              </Link>
              <span style={{ color: '#f59b52' }}>•</span>
              <Link 
                to="/policy" 
                className="text-white/70 hover:text-white text-sm transition-colors duration-300"
                style={{ 
                  borderBottom: '1px solid transparent' 
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#f59b52';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              >
                Shipping Policy
              </Link>
              <span style={{ color: '#f59b52' }}>•</span>
              <a 
                href="policy" 
                className="text-white/70 hover:text-white text-sm transition-colors duration-300"
                style={{ 
                  borderBottom: '1px solid transparent' 
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#f59b52';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              >
                Refund Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
