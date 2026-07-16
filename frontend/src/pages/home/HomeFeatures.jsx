import React, { useState, useEffect } from 'react';
import { Truck, Clock, Leaf, BadgeCheck, Sparkles } from 'lucide-react';

const HomeFeatures = () => {
    useEffect(() => {
        // Smooth scroll polyfill
        window.scrollTo({ top: 0});
    
        return () => {
          document.documentElement.style.scrollBehavior = 'auto';
        };
      }, []);

  const features = [
    {
      icon: <Truck className="w-12 h-12" style={{ color: '#f59b52' }} />,
      title: "Premium Home Delivery",
      description: "Complimentary delivery for all orders above ₹500. Artisanal products delivered with care to your doorstep.",
      gradient: "from-orange-400 to-amber-500"
    },
    
    {
      icon: <Leaf className="w-12 h-12" style={{ color: '#f59b52' }} />,
      title: "Artisanal & Authentic",
      description: "100% authentic spices and coffee sourced directly from heritage farms and traditional growers.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: <BadgeCheck className="w-12 h-12" style={{ color: '#f59b52' }} />,
      title: "Heritage Quality",
      description: "Every product undergoes meticulous quality checks, preserving centuries-old traditions and flavor profiles.",
      gradient: "from-blue-400 to-indigo-500"
    }
  ];

  return (
    <section 
      className="py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #F5EFE6 0%, #EBDACD 50%, #D8C3A5 100%)`
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full" style={{ backgroundColor: '#823000' }}></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full" style={{ backgroundColor: '#f59b52' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full" style={{ backgroundColor: '#ffe5b8' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 mb-6">
            <Sparkles className="w-6 h-6" style={{ color: '#823000' }} />
            <span 
              className="text-sm font-semibold tracking-wider uppercase"
              style={{ color: '#823000' }}
            >
              Premium Experience
            </span>
            <Sparkles className="w-6 h-6" style={{ color: '#823000' }} />
          </div>
          
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: '#823000' }}
          >
            Why Choose SRI BOGAT?
          </h2>
          
          <p 
            className="text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#823000', opacity: 0.8 }}
          >
            Experience the finest in authentic Indian flavors with our premium collection of spices and coffee
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative"
            >
              {/* Main card */}
              <div 
                className="relative bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 text-center border border-white/50 group-hover:transform group-hover:scale-105  overflow-hidden h-80 flex flex-col justify-between"
                style={{
                  background: `linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 229, 184, 0.3) 100%)`
                }}
              >
                {/* Subtle gradient overlay on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, #f59b52 0%, #823000 100%)`
                  }}
                ></div>

                {/* Icon container with floating animation */}
                <div className="relative z-10 flex justify-center mb-6">
                  <div 
                    className="p-4 rounded-full shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:animate-pulse"
                    style={{
                      background: `linear-gradient(135deg, #ffe5b8 0%, rgba(245, 155, 82, 0.2) 100%)`,
                      border: '2px solid rgba(245, 155, 82, 0.3)'
                    }}
                  >
                    {feature.icon}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <h3 
                    className="text-xl font-bold mb-4 group-hover:text-opacity-90 transition-colors duration-300"
                    style={{ color: '#823000' }}
                  >
                    {feature.title}
                  </h3>
                  
                  <p 
                    className="leading-relaxed text-sm"
                    style={{ color: '#823000', opacity: 0.8 }}
                  >
                    {feature.description}
                  </p>
                </div>

                {/* Decorative bottom accent */}
                <div 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full transition-all duration-500 group-hover:w-20"
                  style={{
                    background: `linear-gradient(90deg, #f59b52 0%, #823000 100%)`
                  }}
                ></div>
              </div>


            </div>
          ))}
        </div>

        {/* Bottom decorative element */}
        <div className="text-center mt-16">
          <div 
            className="inline-block px-8 py-3 rounded-full border-2 font-semibold text-sm tracking-wider uppercase transition-all duration-300 hover:transform hover:scale-105"
            style={{
              color: '#823000',
              borderColor: '#f59b52',
              background: 'rgba(255, 229, 184, 0.3)'
            }}
          >
            Crafted with Tradition, Delivered with Excellence
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatures;