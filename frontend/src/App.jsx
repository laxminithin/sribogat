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
          <Toaster position="top-right" />
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
