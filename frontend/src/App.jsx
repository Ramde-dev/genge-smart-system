import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { UserProvider } from './context/UserContext';

// Auth Pages
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';

// Common/Core Pages
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';

// Seller Pages
import SellerDashboard from './pages/seller/Dashboard';
import AddProduct from './pages/seller/AddProduct';
import Analytics from './pages/seller/Analytics';
import Orders from './pages/seller/Orders';
import OrderDetails from './pages/seller/OrderDetails';
import ProductManage from './pages/seller/ProductManage';
import SellerProfile from './pages/seller/Profile';
import EditProduct from './pages/seller/EditProduct';

// Buyer Pages
import BuyerHome from './pages/buyer/Home';
import BuyerCart from './pages/buyer/Cart';
import BuyerProfile from './pages/buyer/Profile';
import BuyerOrders from './pages/buyer/Orders';
import BuyerAddresses from './pages/buyer/Addresses';
import BuyerCheckout from './pages/buyer/Checkout';
import BuyerTracking from './pages/buyer/Tracking';
import BuyerProductDetails from './pages/buyer/ProductDetails';
import BuyerNotifications from './pages/buyer/Notifications';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminManageUsers from './pages/admin/ManageUsers';
import AdminManageSellers from './pages/admin/ManageSellers';
import AdminManageProducts from './pages/admin/ManageProducts';
import AdminManageAgents from './pages/admin/ManageAgents';
import AdminFraudAlerts from './pages/admin/FraudAlerts';
import AdminQualityScores from './pages/admin/QualityScores';
import AdminReports from './pages/admin/Reports';
import AdminNotifications from './pages/admin/Notifications';

// Agent Pages
import AgentDashboard from './pages/agent/Dashboard';
import AgentUpdateLocation from './pages/agent/UpdateLocation';

function App() {
  return (
    <Router>
      <UserProvider>
        <CartProvider>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth Routes (Public) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Common Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Unauthorized Page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Seller Routes */}
            <Route element={<ProtectedRoute roleRequired="seller" />}>
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/seller/add-product" element={<AddProduct />} />
              <Route path="/seller/analytics" element={<Analytics />} />
              <Route path="/seller/orders" element={<Orders />} />
              <Route path="/seller/orders/:id" element={<OrderDetails />} />
              <Route path="/seller/inventory" element={<ProductManage />} />
              <Route path="/seller/profile" element={<SellerProfile />} />
              <Route path="/seller/edit-product/:id" element={<EditProduct />} />
            </Route>

            {/* Protected Buyer Routes */}
            <Route element={<ProtectedRoute roleRequired="buyer" />}>
              <Route path="/buyer/home" element={<BuyerHome />} />
              <Route path="/buyer/cart" element={<BuyerCart />} />
              <Route path="/buyer/profile" element={<BuyerProfile />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/buyer/addresses" element={<BuyerAddresses />} />
              <Route path="/buyer/checkout" element={<BuyerCheckout />} />
              <Route path="/buyer/tracking" element={<BuyerTracking />} />
              <Route path="/buyer/product/:id" element={<BuyerProductDetails />} />
              <Route path="/buyer/notifications" element={<BuyerNotifications />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute roleRequired="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminManageUsers />} />
              <Route path="/admin/sellers" element={<AdminManageSellers />} />
              <Route path="/admin/products" element={<AdminManageProducts />} />
              <Route path="/admin/agents" element={<AdminManageAgents />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/fraud-alerts" element={<AdminFraudAlerts />} />
              <Route path="/admin/quality-scores" element={<AdminQualityScores />} />
              <Route path="/admin/reports" element={<AdminReports />} />
            </Route>

            {/* Protected Agent Routes */}
            <Route element={<ProtectedRoute roleRequired="agent" />}>
              <Route path="/agent/dashboard" element={<AgentDashboard />} />
              <Route path="/agent/update-location" element={<AgentUpdateLocation />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </CartProvider>
      </UserProvider>
    </Router>
  );
}

export default App;