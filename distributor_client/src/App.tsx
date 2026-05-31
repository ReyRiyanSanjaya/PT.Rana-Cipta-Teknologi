import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import OrderList from './pages/orders/OrderList';
import OrderDetail from './pages/orders/OrderDetail';
import Inventory from './pages/Inventory';
import Merchants from './pages/Merchants';
import Shipments from './pages/Shipments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Discounts from './pages/Discounts';
import AcquisitionMap from './pages/AcquisitionMap';
import Subscription from './pages/Subscription';
import WarehouseManagement from './pages/WarehouseManagement';
import Forecasting from './pages/Forecasting';
import Sales from './pages/Sales';
import WarehouseStock from './pages/WarehouseStock';
import Receivables from './pages/Receivables';
import SalesKPI from './pages/SalesKPI';
import Loyalty from './pages/Loyalty';
import Returns from './pages/Returns';
import TeamManagement from './pages/TeamManagement';
import SfaDashboard from './pages/SfaDashboard';
import DmsHierarchy from './pages/DmsHierarchy';
import SfaLeaderboard from './pages/SfaLeaderboard';
import SfaRoutes from './pages/SfaRoutes';
import Accounting from './pages/Accounting';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="merchants" element={<Merchants />} />
          <Route path="acquisition-map" element={<AcquisitionMap />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="warehouses" element={<WarehouseManagement />} />
          <Route path="warehouse-stock" element={<WarehouseStock />} />
          <Route path="forecasting" element={<Forecasting />} />
          <Route path="sales" element={<Sales />} />
          <Route path="receivables" element={<Receivables />} />
          <Route path="returns" element={<Returns />} />
          <Route path="kpi" element={<SalesKPI />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="reports" element={<Reports />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="sfa" element={<SfaDashboard />} />
          <Route path="sfa-leaderboard" element={<SfaLeaderboard />} />
          <Route path="sfa-routes" element={<SfaRoutes />} />
          <Route path="dms" element={<DmsHierarchy />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
