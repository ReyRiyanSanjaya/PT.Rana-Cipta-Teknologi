import React, { Suspense, lazy, useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AIAssistant from './components/AIAssistant'; // [NEW]
import BottomNav from './components/BottomNav'; // [NEW]

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfitLoss = lazy(() => import('./pages/ProfitLoss'));
const Inventory = lazy(() => import('./pages/Inventory'));
const POSMode = lazy(() => import('./pages/POSMode'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Stores = lazy(() => import('./pages/Stores'));
const Reports = lazy(() => import('./pages/Reports'));
const Landing = lazy(() => import('./pages/Landing'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const About = lazy(() => import('./pages/About'));
const Features = lazy(() => import('./pages/Features'));
const Contact = lazy(() => import('./pages/Contact'));
const Support = lazy(() => import('./pages/Support'));
const FlashSales = lazy(() => import('./pages/FlashSales'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Banners = lazy(() => import('./pages/Banners'));
const Settings = lazy(() => import('./pages/Settings'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Game = lazy(() => import('./pages/Game'));
const Community = lazy(() => import('./pages/Community'));
const CommunityPostDetail = lazy(() => import('./pages/CommunityPostDetail')); // [NEW]
const Careers = lazy(() => import('./pages/Careers'));
const CareersAdmin = lazy(() => import('./pages/admin/CareersAdmin'));
const DistributorInfo = lazy(() => import('./pages/DistributorInfo'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Placeholders for other routes
const Placeholder = ({ title }) => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-4 text-slate-500">Modul sedang dalam pengembangan...</p>
    </div>
);

function App() {
    const [bottomNavLayout, setBottomNavLayout] = useState({
        height: 0,
        isVisible: false
    });

    const handleBottomNavLayout = useCallback((layout) => {
        setBottomNavLayout((prev) => {
            const next = {
                height: typeof layout?.height === 'number' ? layout.height : 0,
                isVisible: Boolean(layout?.isVisible)
            };
            if (prev.height === next.height && prev.isVisible === next.isVisible) return prev;
            return next;
        });
    }, []);

    const floatingBottomOffset =
        bottomNavLayout.isVisible && bottomNavLayout.height > 0
            ? bottomNavLayout.height + 24
            : 24;

    return (
        <AuthProvider>
            <NotificationProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0a0b0f] text-slate-200">Memuat...</div>}>
                        <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/blog" element={<BlogList />} />
                        <Route path="/blog/:slug" element={<BlogDetail />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/features" element={<Features />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/community/post/:id" element={<CommunityPostDetail />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/careers" element={<Careers />} />
                        <Route path="/distributor" element={<DistributorInfo />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route path="/dashboard" element={<Dashboard />} />

                        <Route path="/pos" element={
                            <ProtectedRoute>
                                <POSMode />
                            </ProtectedRoute>
                        } />
                        <Route path="/profit-loss" element={
                            <ProtectedRoute allowedRoles={['OWNER', 'STORE_MANAGER']}>
                                <ProfitLoss />
                            </ProtectedRoute>
                        } />
                        <Route path="/inventory" element={
                            <ProtectedRoute allowedRoles={['OWNER', 'STORE_MANAGER']}>
                                <Inventory />
                            </ProtectedRoute>
                        } />
                        <Route path="/transactions" element={
                            <ProtectedRoute allowedRoles={['OWNER', 'STORE_MANAGER']}>
                                <Transactions />
                            </ProtectedRoute>
                        } />
                        <Route path="/game" element={
                            <ProtectedRoute>
                                <Game />
                            </ProtectedRoute>
                        } />


                        <Route path="/reports" element={
                            <ProtectedRoute allowedRoles={['OWNER', 'STORE_MANAGER']}>
                                <Reports />
                            </ProtectedRoute>
                        } />
                        <Route path="/flashsales" element={
                            <ProtectedRoute allowedRoles={['OWNER', 'STORE_MANAGER']}>
                                <FlashSales />
                            </ProtectedRoute>
                        } />
                        <Route path="/subscription" element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'OWNER']}>
                                <Subscription />
                            </ProtectedRoute>
                        } />

                        <Route path="/wallet" element={
                            <ProtectedRoute>
                                <Wallet />
                            </ProtectedRoute>
                        } />



                        <Route path="/stores" element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <Stores />
                            </ProtectedRoute>
                        } />
                        <Route path="/banners" element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <Banners />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/careers" element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <CareersAdmin />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        } />
                        <Route path="/support" element={
                            <ProtectedRoute>
                                <Support />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
                <AIAssistant bottomOffset={floatingBottomOffset} />
                <BottomNav onLayoutChange={handleBottomNavLayout} />
            </Router>
            </NotificationProvider>
        </AuthProvider>
    );
}

export default App;
