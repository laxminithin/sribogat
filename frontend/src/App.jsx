import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './pages/checkout/AuthProvider';
import CartProvider from './pages/checkout/CartContext';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 3500,
              style: {
                background: '#ffffff',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                maxWidth: '380px',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
                style: { borderLeft: '4px solid #16a34a' },
              },
              error: {
                duration: 4500,
                iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                style: { borderLeft: '4px solid #dc2626' },
              },
            }}
          />
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
