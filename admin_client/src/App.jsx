import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
import Withdrawals from './pages/Withdrawals';
import Merchants from './pages/Merchants';
import AcquisitionMap from './pages/AcquisitionMap';
import Packages from './pages/Packages';
import Broadcasts from './pages/Broadcasts'; // [UPDATED]
import Support from './pages/Support'; // [NEW]
import Settings from './pages/Settings';
import SubscriptionRequests from './pages/SubscriptionRequests';
import Reports from './pages/Reports'; // [NEW]
import Profile from './pages/Profile'; // [NEW]
import AuditLogs from './pages/AuditLogs'; // [NEW]
import ContentManager from './pages/ContentManager'; // [NEW]
import CareersAdmin from './pages/CareersAdmin'; // [NEW]
import Billing from './pages/Billing'; // [NEW]
import AppMenus from './pages/AppMenus'; // [NEW]
import MerchantDetail from './pages/MerchantDetail'; // [NEW]
import AdminUsers from './pages/AdminUsers'; // [NEW]
import TopUps from './pages/TopUps'; // [NEW]
import Transactions from './pages/Transactions'; // [NEW]
import ManageMenu from './pages/ManageMenu'; // [NEW]
import AdminLayout from './components/AdminLayout';
import FlashSales from './pages/FlashSales';
import ReferralMonitoring from './pages/ReferralMonitoring';
import DriverManagement from './pages/DriverManagement'; // [NEW] Driver Integration
import DriverMap from './pages/DriverMap'; // [NEW] Driver Map
import DistributorManagement from './pages/DistributorManagement'; // [NEW] Distributor
import BuyerManagement from './pages/BuyerManagement'; // [NEW] Buyer
import AiMarketing from './pages/AiMarketing'; // [NEW] AI Marketing
import EmailRecipients from './pages/EmailRecipients'; // [NEW] Email Recipients
import BannerManagement from './pages/BannerManagement'; // [NEW] Banner Slider
import { getToken, isTokenExpired, getUser } from './lib/auth';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  if (isTokenExpired()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!user || user.role !== 'SUPER_ADMIN') return <Navigate to="/login" replace />;
  return children;
};

import Dashboard from './pages/Dashboard';
import BlogManager from './pages/BlogManager'; // [NEW]
import Announcements from './pages/Announcements'; // [NEW]
import ChatRooms from './pages/ChatRooms'; // [NEW]
import Discussions from './pages/Discussions'; // [NEW]
import DiscussionTopics from './pages/DiscussionTopics'; // [NEW]
import ContactInbox from './pages/ContactInbox'; // [NEW]
import Notifications from './pages/Notifications'; // [NEW]

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="content" element={<ContentManager />} />
            <Route path="careers" element={<CareersAdmin />} />
            <Route path="contact-inbox" element={<ContactInbox />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="blog" element={<BlogManager />} />
            <Route path="billing" element={<Billing />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="topups" element={<TopUps />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="merchants/:id" element={<MerchantDetail />} />
            <Route path="merchants/:storeId/menu" element={<ManageMenu />} />
            <Route path="subscriptions" element={<SubscriptionRequests />} />
            <Route path="map" element={<AcquisitionMap />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
            <Route path="packages" element={<Packages />} />
            <Route path="broadcasts" element={<Broadcasts />} />
            <Route path="chat-rooms" element={<ChatRooms />} />
            <Route path="discussions" element={<Discussions />} />
            <Route path="discussion-topics" element={<DiscussionTopics />} />
            <Route path="support" element={<Support />} />
            <Route path="settings" element={<Settings />} />
            <Route path="app-menus" element={<AppMenus />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="flashsales" element={<FlashSales />} />
            <Route path="referrals" element={<ReferralMonitoring />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="drivers" element={<DriverManagement />} />
            <Route path="drivers/map" element={<DriverMap />} />
            <Route path="distributors" element={<DistributorManagement />} />
            <Route path="buyers" element={<BuyerManagement />} />
            <Route path="ai-marketing" element={<AiMarketing />} />
            <Route path="email-recipients" element={<EmailRecipients />} />
            <Route path="banners" element={<BannerManagement />} />
          </Route>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
